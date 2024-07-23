import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from 'src/users/users.service'
import { LoginDto, LoginWithOtpDto } from './dto/login.dto'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from './dto/registration.dto'
import { Otp, Role, Session, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { compareHash, createOtpCode, generateRandomPassword, hashValue } from 'src/utils/helpers'
import { MailsService } from 'src/mails/mails.service'

@Injectable()
export class AuthService {
    QUANTITY_NUMBERS_IN_OTP = 4
    MAX_QUANTITY_SESSIONS = 3

    constructor(
        private jwt: JwtService,
        private usersService: UsersService,
        private prisma: PrismaService,
        private mailsService: MailsService
    ) {}

    async login(dto: LoginDto) {
        const { password, ...user } = await this.validateUser(dto)
        const isUserAdmin = await this.isUserAdminAndSendOtp(user)

        if (isUserAdmin) {
            return { otp: true }
        }

        const tokens = await this.issueTokens(user.id, user.role, dto.rememberMe)

        return {
            user,
            ...tokens,
        }
    }

    async createSession({
        userId,
        sessions,
        refreshToken,
        rememberMe,
    }: {
        userId: number
        sessions: Session[]
        refreshToken: string
        rememberMe: boolean
    }) {
        if (sessions.length >= this.MAX_QUANTITY_SESSIONS) {
            await this.prisma.session.delete({
                where: {
                    id: sessions[0].id,
                },
            })
        }

        await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                session: {
                    create: {
                        refreshToken,
                        expiredIn: new Date(Date.now() + 1000 * 60 * 60 * (rememberMe ? 24 * 30 : 8)),
                    },
                },
            },
        })
    }

    async checkSession(userId: number, refreshToken: string) {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId,
            },
        })

        if (sessions.length === 0) {
            return false
        }

        const currentSession = sessions.find(session => session.refreshToken === refreshToken)

        if (!currentSession) {
            return false
        }

        if (currentSession.expiredIn.getDate() > Date.now()) {
            await this.prisma.session.delete({
                where: {
                    id: currentSession.id,
                },
            })

            return false
        }

        return currentSession.id
    }

    async addNewTokenToSession(sessionId: number, refreshToken: string) {
        await this.prisma.session.update({
            where: {
                id: sessionId,
            },
            data: {
                refreshToken,
            },
        })
    }

    async deleteSessionWithUserIdAndRefreshToken(userId: number, refreshToken: string) {
        await this.prisma.session.deleteMany({
            where: {
                userId,
                refreshToken,
            },
        })
    }

    private async isUserAdminAndSendOtp(user: Partial<User>) {
        if (user.role === Role.ADMIN) {
            const otp = createOtpCode(this.QUANTITY_NUMBERS_IN_OTP)
            this.mailsService.sendOtpCode(user.email, otp.toString())
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

    async loginWithOtp(dto: LoginWithOtpDto) {
        const user = await this.usersService.getFullUserInfo(null, dto.email)
        if (!user) throw new NotFoundException('Пользователь не найден')

        const otp = user.otps[0]
        if (!otp) throw new NotFoundException('У пользователя отсутствует код подтверждения')

        await this.checkOtp(user, otp, dto.otp)

        await this.prisma.otp.deleteMany({
            where: {
                userId: user.id,
            },
        })

        const tokens = await this.issueTokens(user.id, user.role)

        return {
            user,
            ...tokens,
        }
    }

    private async checkOtp(user: Partial<User>, otp: Otp, otpToCheck: string) {
        const isValid = await compareHash(otpToCheck, otp.code)

        if (!isValid) {
            if (otp.attempts >= 5) {
                await this.prisma.otp.delete({
                    where: {
                        id: otp.id,
                    },
                })

                this.isUserAdminAndSendOtp(user)

                throw new UnauthorizedException('Вам на почту отправлен новый код')
            }

            await this.prisma.otp.update({
                where: {
                    id: otp.id,
                },
                data: {
                    attempts: {
                        increment: 1,
                    },
                },
            })

            throw new UnauthorizedException('Неверный код подтверждения')
        }
    }

    async createPasswordReset(email: string) {
        const user = await this.usersService.getFullUserInfo(null, email)

        if (!user) throw new NotFoundException('Пользователь не найден')

        const passwordResetNote = user.passwordReset[0]

        if (passwordResetNote) {
            if (passwordResetNote.createdAt.getTime() + 1000 * 60 > new Date().getTime()) {
                throw new BadRequestException('Повторно получить новый пароль можно через 1 минуту')
            }

            await this.prisma.passwordReset.deleteMany({
                where: {
                    userId: user.id,
                },
            })
        }

        const newPassword = generateRandomPassword(12, 15)
        this.mailsService.sendForgotPasswordMail(email, newPassword)

        await this.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordReset: {
                    create: {
                        newPassword: await hashValue(newPassword),
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

    private async issueTokens(userId: number, role: Role = Role.STUDENT, rememberMe: boolean = false) {
        const data = { id: userId, role }

        const accessToken = this.jwt.sign(data, {
            expiresIn: '15m',
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: `${rememberMe ? '30d' : '8h'}`,
        })

        return { accessToken, refreshToken }
    }

    private async validateUser(dto: LoginDto) {
        const user = await this.usersService.getFullUserInfo(null, dto.email)

        if (!user) throw new NotFoundException('Не верный логин или пароль')

        const newPasswordNote = user.passwordReset[0]

        if (newPasswordNote) {
            const isNewPasswordValid = await compareHash(dto.password, newPasswordNote.newPassword)

            if (isNewPasswordValid) {
                await this.updateUserPasswordAndDeleteResetPasswordNote(user.id, dto.password)

                return user
            }
        }

        const isValid = await bcrypt.compare(dto.password, user.password)

        if (!isValid) throw new UnauthorizedException('Не верный логин или пароль')

        return user
    }

    private async updateUserPasswordAndDeleteResetPasswordNote(userId: number, password: string) {
        await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                password: await hashValue(password),
                passwordReset: {
                    deleteMany: {
                        userId,
                    },
                },
            },
        })
    }
}
