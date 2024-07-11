import { BadRequestException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma.service'
import { RegistrationDto } from '../auth/dto/registration.dto'
import { Role, User } from '@prisma/client'
import { generateRandomPassword } from 'src/utils/helpers'

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async getCurrentUser({ currentUser, searchedUserId }: { currentUser: User; searchedUserId: string }) {
        if (!searchedUserId || currentUser) {
            return new BadRequestException('Ошибка запроса')
        }
        if (currentUser.id === +searchedUserId) {
            const { password, ...result } = currentUser
            return result
        }
        const searchedUser = await this.getById(+searchedUserId)

        if (!searchedUser) {
            throw new BadRequestException('Пользователь не найден')
        }

        if (currentUser.role === Role.ADMIN) {
            const { password, ...result } = searchedUser
            return result
        }

        if (currentUser.role === Role.TEACHER && searchedUser.role === Role.STUDENT) {
            const allStudentsOfCurrentTeacher = await this.getAllStudentsOfOneTeacher(currentUser.id)
            if (allStudentsOfCurrentTeacher) {
                const isSearchedUserStudentOfCurrentTeacher = allStudentsOfCurrentTeacher.some(
                    student => student.id === +searchedUserId
                )

                if (isSearchedUserStudentOfCurrentTeacher) {
                    const { password, ...result } = searchedUser
                    return result
                }
            }
        }

        throw new BadRequestException('Пользователь не найден')
    }

    async getUsers() {
        return this.prisma.user.findMany({
            select: {
                email: true,
                id: true,
                password: false,
            },
        })
    }

    async getById(id: number) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
        })
    }

    async getByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                email: true,
                id: true,
                password: true,
                profile: {
                    select: {
                        name: true,
                        surname: true,
                        patronymic: true,
                        phone: true,
                        telegram: true,
                        avatar: true,
                        birthday: true,
                    },
                },
            },
        })
    }

    async create(dto: RegistrationDto) {
        const password = generateRandomPassword(12, 15)

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                profile: {
                    create: {
                        name: dto.name,
                        surname: dto.surname,
                        patronymic: dto.patronymic,
                        phone: dto.phone,
                        telegram: dto.telegram,
                        avatar: dto.avatar,
                        birthday: dto.birthday,
                    },
                },
            },
            select: {
                email: true,
                id: true,
                password: true,
                profile: {
                    select: {
                        name: true,
                        surname: true,
                        patronymic: true,
                        phone: true,
                        telegram: true,
                        avatar: true,
                        birthday: true,
                    },
                },
            },
        })
    }

    async getAllStudentsOfOneTeacher(teacherId: number) {
        return this.prisma.student.findMany({
            where: {
                teacherId,
            },
        })
    }
}