import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from 'src/users/users.service'
import { LoginDto, LoginWithOtpDto } from './dto/login.dto'
import { RegistrationDto } from './dto/registration.dto'
import { Otp, Role, Session, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { compareHash, createOtpCode, generateRandomPassword, hashValue } from 'src/utils/helpers'
import { MailsService } from 'src/mails/mails.service'
import { Cron } from '@nestjs/schedule'

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

        return user
    }

    async createSession({
        userId,
        sessions,
        rememberMe,
    }: {
        userId: number
        sessions: Session[]
        rememberMe: boolean
    }) {
        if (sessions.length >= this.MAX_QUANTITY_SESSIONS) {
            await this.prisma.session.delete({
                where: {
                    id: sessions[0].id,
                },
            })
        }

        return this.prisma.session.create({
            data: {
                expiredIn: new Date(Date.now() + 1000 * 60 * 60 * (rememberMe ? 24 * 30 : 8)),
                User: {
                    connect: {
                        id: userId,
                    },
                },
            },
        })
    }

    async checkSession(sessionId: number) {
        const session = await this.prisma.session.findUnique({
            where: {
                id: sessionId,
            },
        })
        if (!session) {
            return false
        }
        if (session.expiredIn.getDate() > Date.now()) {
            await this.prisma.session.delete({
                where: {
                    id: sessionId,
                },
            })
            return false
        }

        return sessionId
    }

    async deleteSession(userId: number) {
        await this.prisma.session.deleteMany({
            where: {
                userId,
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

        return user
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

        if (user.role === Role.STUDENT) {
            const purchasedTariffs = user.student.purchasedTariffs
            const firstSuccessPaymentTariff = purchasedTariffs.find(tariff => tariff.paymentStatus === 'succeeded')

            if (!firstSuccessPaymentTariff) {
                throw new BadRequestException('Вы не можете получить новый пароль')
            }
        }

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

    async registrationAdmin(dto: RegistrationDto, avatar?: Express.Multer.File) {
        const oldUser = await this.usersService.getByEmail(dto.email)

        if (oldUser) throw new BadRequestException(`Пользователь с почтой ${dto.email} уже существует`)

        const { password, ...user } = await this.usersService.createAdmin(dto, avatar)

        return {
            user,
        }
    }

    async getNewTokens(refreshToken: string) {
        try {
            const result = await this.jwt.verifyAsync(refreshToken)
            if (!result) throw new UnauthorizedException('Invalid refresh token')

            const { password, ...user } = await this.usersService.getById(result.id)

            const tokens = await this.issueTokens({
                userId: user.id,
                role: user.role,
                rememberMe: result.rememberMe,
                sessionId: result.sessionId,
            })

            return {
                user,
                ...tokens,
            }
        } catch (error) {
            console.error(error)
            throw new UnauthorizedException('Invalid refresh token')
        }
    }

    async issueTokens({
        userId,
        role = Role.STUDENT,
        rememberMe = false,
        sessionId,
    }: {
        userId: number
        role: Role
        rememberMe: boolean
        sessionId?: number
    }) {
        const data = { id: userId, role, sessionId }

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

    @Cron('0 0 0 * * *')
    async deleteMessagesAndFilesAfterSixMonths() {
        const threeHoursAgo = new Date()
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3)

        await this.prisma.otp.deleteMany({
            where: {
                createdAt: {
                    lt: threeHoursAgo,
                },
            },
        })

        await this.prisma.passwordReset.deleteMany({
            where: {
                createdAt: {
                    lt: threeHoursAgo,
                },
            },
        })
    }
}
