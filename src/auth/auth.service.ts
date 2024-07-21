import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'
import * as bcrypt from 'bcrypt'
import { UsersService } from 'src/users/users.service'
import { LoginDto } from './dto/login.dto'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from './dto/registration.dto'
import { Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { createOtpCode, hashValue } from 'src/utils/helpers'

@Injectable()
export class AuthService {
    EXPIRE_DAY_REFRESH_TOKEN = 1
    REFRESH_TOKEN_NAME = 'refreshToken'
    QUANTITY_NUMBERS_IN_OTP = 4

    constructor(
        private jwt: JwtService,
        private usersService: UsersService,
        private prisma: PrismaService
    ) {}

    async login(dto: LoginDto) {
        const { password, ...user } = await this.validateUser(dto)
        const isUserAdmin = await this.isUserAdminAndSendOtp(user)

        if (isUserAdmin) {
            return { otp: true }
        }

        const tokens = await this.issueTokens(user.id, user.role)

        return {
            user,
            ...tokens,
        }
    }

    private async isUserAdminAndSendOtp(user: Partial<User>) {
        if (user.role === Role.ADMIN) {
            const otp = createOtpCode(this.QUANTITY_NUMBERS_IN_OTP)
            await this.createOtpToUser(user.id, otp.toString())
            return true
        }
        return false
    }

    private async createOtpToUser(userId: number, code: string) {
        const userOtps = await this.prisma.otp.findMany({
            where: {
                userId,
            },
        })

        if (userOtps.length >= 1) {
            await this.prisma.otp.deleteMany({
                where: {
                    userId,
                },
            })
        }

        await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                otps: {
                    create: {
                        code: await hashValue(code),
                    },
                },
            },
        })
    }

    async registrationAdmin(dto: RegistrationDto) {
        const oldUser = await this.usersService.getByEmail(dto.email)

        if (oldUser) throw new BadRequestException(`Пользователь с почтой ${dto.email} уже существует`)

        const { password, ...user } = await this.usersService.createAdmin(dto)

        const { refreshToken } = await this.issueTokens(user.id, user.role)

        return {
            user,
            refreshToken,
        }
    }

    async registrationStudent(dto: RegistrationStudentDto) {
        const oldUser = await this.usersService.getByEmail(dto.email)

        if (oldUser) throw new BadRequestException(`Пользователь с почтой ${dto.email} уже существует`)

        const { password, ...user } = await this.usersService.createStudent(dto)

        const { refreshToken } = await this.issueTokens(user.id, user.role)

        return {
            user,
            refreshToken,
        }
    }

    async registrationTeacher(dto: RegistrationTeacherDto) {
        const oldUser = await this.usersService.getByEmail(dto.email)

        if (oldUser) throw new BadRequestException(`Пользователь с почтой ${dto.email} уже существует`)

        const { password, ...user } = await this.usersService.createTeacher(dto)

        const { refreshToken } = await this.issueTokens(user.id, user.role)

        return {
            user,
            refreshToken,
        }
    }

    async getNewTokens(refreshToken: string) {
        try {
            const result = await this.jwt.verifyAsync(refreshToken)
            if (!result) throw new UnauthorizedException('Invalid refresh token')

            const { password, ...user } = await this.usersService.getById(result.id)

            const tokens = await this.issueTokens(user.id, user.role)

            return {
                user,
                ...tokens,
            }
        } catch (error) {
            console.error(error)
            throw new UnauthorizedException('Invalid refresh token')
        }
    }

    private async issueTokens(userId: number, role: Role = Role.STUDENT) {
        const data = { id: userId, role }

        const accessToken = this.jwt.sign(data, {
            expiresIn: '1h',
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: '7d',
        })

        return { accessToken, refreshToken }
    }

    private async validateUser(dto: LoginDto) {
        const user = await this.usersService.getByEmail(dto.email)

        if (!user) throw new NotFoundException('Не верный логин или пароль')

        const isValid = await bcrypt.compare(dto.password, user.password)

        if (!isValid) throw new UnauthorizedException('Не верный логин или пароль')

        return user
    }

    addRefreshTokenToResponse(res: Response, refreshToken: string) {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

        res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            // todo change to variables
            domain: process.env.CLIENT_HOST,
            expires: expiresIn,
            // true if production
            secure: true,
            // lax if production
            sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
        })
    }

    removeRefreshTokenFromResponse(res: Response) {
        res.cookie(this.REFRESH_TOKEN_NAME, '', {
            httpOnly: true,
            domain: process.env.CLIENT_HOST,
            expires: new Date(0),
            // true if production
            secure: true,
            // lax if production
            sameSite: process.env.SAME_SITE_COOKIE as 'none' | 'lax' | 'strict' | 'none',
        })
    }
}
