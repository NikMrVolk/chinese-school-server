import { Body, Controller, ForbiddenException, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from './dto/registration.dto'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'
import { TariffsService } from 'src/tariffs/tariffs.service'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly tariffsService: TariffsService
    ) {}

    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.login(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Post('registration/admin')
    async register(
        @Body() dto: RegistrationDto,
        @Res({ passthrough: true }) res: Response,
        @CurrentUser() currentUser: User
    ) {
        if (currentUser.email !== process.env.MAIN_ADMIN_EMAIL) {
            throw new ForbiddenException('С вашего аккаунта такое действие недоступно')
        }

        const { refreshToken, ...response } = await this.authService.registrationAdmin(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
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
    async registrationStudent(@Body() dto: RegistrationStudentDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.registrationStudent(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
        return response
    }

    @HttpCode(200)
    @Post('registration/teacher')
    async registrationTeacher(@Body() dto: RegistrationTeacherDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.registrationTeacher(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
        return response
    }

    // @HttpCode(200)
    // @Post('otp')
    // async otp(@Body() dto: { code: string }, @Res({ passthrough: true }) res: Response) {}

    @HttpCode(200)
    @Post('access-token')
    async getNewTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshTokenFromCookies = req.cookies[this.authService.REFRESH_TOKEN_NAME]

        if (!refreshTokenFromCookies) {
            this.authService.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Refresh token not passed')
        }

        const { refreshToken, ...response } = await this.authService.getNewTokens(refreshTokenFromCookies)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
        return response
    }

    @HttpCode(200)
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        this.authService.removeRefreshTokenFromResponse(res)

        return true
    }
}
