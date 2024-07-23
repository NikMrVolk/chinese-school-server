import { Body, Controller, ForbiddenException, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto, LoginWithOtpDto } from './dto/login.dto'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from './dto/registration.dto'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'
import { TariffsService } from 'src/tariffs/tariffs.service'
import { JwtService } from '@nestjs/jwt'
import { JwtPayload } from 'src/utils/types'

@Controller('auth')
export class AuthController {
    REFRESH_TOKEN_NAME = 'refreshToken'
    REMEMBER_ME_COOKIE_NAME = 'rememberMe'

    constructor(
        private readonly authService: AuthService,
        private readonly tariffsService: TariffsService,
        private jwt: JwtService
    ) {}

    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const userWithTokenOrOtp = await this.authService.login(dto)

        if ('otp' in userWithTokenOrOtp) {
            return { ...userWithTokenOrOtp, date: new Date() }
        }

        const { refreshToken, ...response } = userWithTokenOrOtp

        await this.authService.createSession({
            userId: response.user.id,
            sessions: response.user.session,
            refreshToken,
            rememberMe: dto.rememberMe,
        })
        this.addRefreshTokenToResponse(res, refreshToken, dto.rememberMe)

        return response
    }

    @HttpCode(200)
    @Post('otp')
    async loginOtp(@Body() dto: LoginWithOtpDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.loginWithOtp(dto)

        await this.authService.createSession({
            userId: response.user.id,
            sessions: response.user.session,
            refreshToken,
            rememberMe: dto.rememberMe,
        })
        this.addRefreshTokenToResponse(res, refreshToken, dto.rememberMe)

        return response
    }

    @HttpCode(200)
    @Post('forgot-password')
    async forgotPassword(@Body() dto: { email: string }) {
        await this.authService.createPasswordReset(dto.email)

        return { message: 'Новый пароль отправлен на почту' }
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Post('registration/admin')
    async register(@Body() dto: RegistrationDto, @CurrentUser() currentUser: User) {
        if (currentUser.email !== process.env.MAIN_ADMIN_EMAIL) {
            throw new ForbiddenException('С вашего аккаунта такое действие недоступно')
        }

        const { refreshToken, ...response } = await this.authService.registrationAdmin(dto)
        return response
    }

    @Admin()
    @HttpCode(200)
    @Post('registration/student-order')
    async createOrder(@Body() dto: RegistrationStudentDto) {
        await this.tariffsService.isTariffActiveAndExist(dto.tariffId)

        const { refreshToken, ...response } = await this.authService.registrationStudent(dto)

        // todo fix deploy error
        // await this.tariffsService.createPurchase({ student: response.user.student, tariffId: dto.tariffId })

        return response
    }

    // todo после реализации оплаты продумать как делается пользователь
    @HttpCode(200)
    @Post('registration/student/id')
    async registrationStudent(@Body() dto: RegistrationStudentDto) {
        const { refreshToken, ...response } = await this.authService.registrationStudent(dto)
        return response
    }

    @HttpCode(200)
    @Post('registration/teacher')
    async registrationTeacher(@Body() dto: RegistrationTeacherDto) {
        const { refreshToken, ...response } = await this.authService.registrationTeacher(dto)
        return response
    }

    @HttpCode(200)
    @Post('access-token')
    async getNewTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshTokenFromCookies = req.cookies[this.REFRESH_TOKEN_NAME]
        const rememberMe = req.cookies[this.REMEMBER_ME_COOKIE_NAME] === 'true'

        if (!refreshTokenFromCookies) {
            this.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Refresh token not passed')
        }

        let userId: number
        try {
            userId = this.jwt.decode<JwtPayload>(refreshTokenFromCookies)?.id
        } catch (error) {
            console.error(error)
        }

        if (!userId) {
            this.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Invalid refresh token')
        }

        const sessionId = await this.authService.checkSession(userId, refreshTokenFromCookies)
        if (!sessionId) {
            this.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Invalid refresh token')
        }

        const { refreshToken, ...response } = await this.authService.getNewTokens(refreshTokenFromCookies)
        await this.authService.addNewTokenToSession(sessionId, refreshToken)
        this.addRefreshTokenToResponse(res, refreshToken, rememberMe)
        return response
    }

    @Auth()
    @HttpCode(200)
    @Post('logout')
    async userLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() currentUser: User) {
        const refreshTokenFromCookies = req.cookies[this.REFRESH_TOKEN_NAME]

        await this.authService.deleteSessionWithUserIdAndRefreshToken(currentUser.id, refreshTokenFromCookies)
        this.removeRefreshTokenFromResponse(res)

        return true
    }

    @HttpCode(200)
    @Post('logout/auto')
    async autoLogout(@Res({ passthrough: true }) res: Response) {
        this.removeRefreshTokenFromResponse(res)

        return true
    }

    private addRefreshTokenToResponse(res: Response, refreshToken: string, rememberMe: boolean = false) {
        const expiresIn = new Date()
        if (rememberMe) {
            expiresIn.setDate(expiresIn.getDate() + 30)

            res.cookie(this.REMEMBER_ME_COOKIE_NAME, 'true', {
                httpOnly: true,
                domain: process.env.CLIENT_HOST,
                expires: expiresIn,
                secure: true,
                sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
            })
        } else {
            expiresIn.setHours(expiresIn.getHours() + 8)
        }

        res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            // todo change to variables
            domain: process.env.CLIENT_HOST,
            expires: expiresIn,
            secure: true,
            sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
        })
    }

    private removeRefreshTokenFromResponse(res: Response) {
        res.cookie(this.REFRESH_TOKEN_NAME, '', {
            httpOnly: true,
            domain: process.env.CLIENT_HOST,
            expires: new Date(0),
            secure: true,
            sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
        })

        res.cookie(this.REMEMBER_ME_COOKIE_NAME, false, {
            httpOnly: true,
            domain: process.env.CLIENT_HOST,
            expires: new Date(0),
            secure: true,
            sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
        })
    }
}
