import {
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegistrationDto } from './dto/registration.dto'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.login(dto)

        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('registration')
    async register(@Body() dto: RegistrationDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.register(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('registration/payment')
    async studentRegistrationPayment(@Body() dto: RegistrationDto, @Res({ passthrough: true }) res: Response) {
        const { refreshToken, ...response } = await this.authService.register(dto)
        this.authService.addRefreshTokenToResponse(res, refreshToken)
        return response
    }

    @HttpCode(200)
    @Post('login/access-token')
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
