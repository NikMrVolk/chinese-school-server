import {
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto, LoginWithOtpDto } from './dto/login.dto'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from './dto/registration.dto'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'
import { TariffsService } from 'src/tariffs/tariffs.service'
import { JwtService } from '@nestjs/jwt'
import { JwtPayload } from 'src/utils/types'
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express'
import { UsersService } from 'src/users/users.service'

@Controller('auth')
export class AuthController {
    REFRESH_TOKEN_NAME = 'refreshToken'
    REMEMBER_ME_COOKIE_NAME = 'rememberMe'

    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
        private readonly tariffsService: TariffsService,
        private jwt: JwtService
    ) {}

    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const userOrOtp = await this.authService.login(dto)

        if ('otp' in userOrOtp) {
            return { ...userOrOtp, date: new Date() }
        }

        const user = userOrOtp

        const session = await this.authService.createSession({
            userId: user.id,
            sessions: user.session,
            rememberMe: dto.rememberMe,
        })

        const tokens = await this.authService.issueTokens({
            userId: user.id,
            role: user.role,
            rememberMe: dto.rememberMe,
            sessionId: session.id,
        })

        this.addRefreshTokenToResponse(res, tokens.refreshToken, dto.rememberMe)

        const { otps, session: userSessions, passwordReset, ...userToResponse } = user

        return { user: userToResponse, accessToken: tokens.accessToken }
    }

    @HttpCode(200)
    @Post('otp')
    async loginOtp(@Body() dto: LoginWithOtpDto, @Res({ passthrough: true }) res: Response) {
        const user = await this.authService.loginWithOtp(dto)

        const session = await this.authService.createSession({
            userId: user.id,
            sessions: user.session,
            rememberMe: dto.rememberMe,
        })

        const tokens = await this.authService.issueTokens({
            userId: user.id,
            role: user.role,
            rememberMe: dto.rememberMe,
            sessionId: session.id,
        })

        this.addRefreshTokenToResponse(res, tokens.refreshToken, dto.rememberMe)

        const { otps, session: userSessions, password, passwordReset, ...userToResponse } = user

        return { user: userToResponse, accessToken: tokens.accessToken }
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
    @UseInterceptors(FileInterceptor('avatar'))
    @Post('registration/admin')
    async register(
        @Body() dto: RegistrationDto,
        @CurrentUser() currentUser: User,
        @UploadedFile() avatar?: Express.Multer.File
    ) {
        if (currentUser.email !== process.env.MAIN_ADMIN_EMAIL) {
            throw new ForbiddenException('С вашего аккаунта такое действие недоступно')
        }

        const response = await this.authService.registrationAdmin(dto, avatar)
        return response
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'avatar', maxCount: 1 },
            { name: 'youtubeVideoPreviewUrl', maxCount: 1 },
        ])
    )
    @Post('registration/teacher')
    async registrationTeacher(
        @Body() dto: RegistrationTeacherDto,
        @UploadedFiles()
        files: { avatar?: Express.Multer.File; youtubeVideoPreviewUrl?: Express.Multer.File }
    ) {
        const { password, ...user } = await this.usersService.createTeacher(dto, files)

        return user
    }

    @Admin()
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('avatar'))
    @Post('registration/student')
    async createOrder(@Body() dto: RegistrationStudentDto, @UploadedFile() avatar?: Express.Multer.File) {
        const tariff = await this.tariffsService.isTariffExist(dto.tariffTitle)

        const { password, ...user } = await this.usersService.createStudent(dto, tariff, avatar)

        return user
    }

    // todo после реализации оплаты продумать как делается пользователь
    // @HttpCode(200)
    // @Post('registration/student/:id')
    // async registrationStudent(@Body() dto: RegistrationStudentDto) {
    //     const { refreshToken, ...response } = await this.authService.registrationStudent(dto)
    //     return response
    // }

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
        let sessionIdFromJwt: number
        try {
            userId = this.jwt.decode<JwtPayload>(refreshTokenFromCookies).id
            sessionIdFromJwt = this.jwt.decode<JwtPayload>(refreshTokenFromCookies).sessionId
        } catch (error) {
            console.error(error)
        }

        if (!userId && !sessionIdFromJwt) {
            this.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Invalid refresh token')
        }
        const sessionId = await this.authService.checkSession(sessionIdFromJwt)
        if (!sessionId) {
            this.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Invalid refresh token')
        }
        const { refreshToken, ...response } = await this.authService.getNewTokens(refreshTokenFromCookies)
        this.addRefreshTokenToResponse(res, refreshToken, rememberMe)
        return response
    }

    @Auth()
    @HttpCode(200)
    @Post('logout')
    async userLogout(@Res({ passthrough: true }) res: Response, @CurrentUser() currentUser: User) {
        await this.authService.deleteSession(currentUser.id)
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
