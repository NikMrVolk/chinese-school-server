import { BadRequestException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma.service'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from '../auth/dto/registration.dto'
import { Role, User } from '@prisma/client'
import { generateRandomPassword } from 'src/utils/helpers'
import { ProfileDto } from 'src/auth/dto/profile.dto'

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async getCurrentUser({ currentUser, searchedUserId }: { currentUser: User; searchedUserId: number }) {
        if (!searchedUserId || !currentUser) {
            throw new BadRequestException('Ошибка запроса')
        }

        if (currentUser.id === searchedUserId) {
            return this.getFullUserInfo(currentUser.id)
        }

        const searchedUser = await this.getFullUserInfo(searchedUserId)

        if (!searchedUser) {
            throw new BadRequestException('Пользователь не найден')
        }

        if (currentUser.role === Role.ADMIN) {
            return searchedUser
        }

        if (currentUser.role === Role.TEACHER && searchedUser.role === Role.STUDENT) {
            const allStudentsOfCurrentTeacher = await this.getAllStudentsOfOneTeacher(currentUser.id)
            if (allStudentsOfCurrentTeacher) {
                const isSearchedUserStudentOfCurrentTeacher = allStudentsOfCurrentTeacher.some(
                    student => student.id === searchedUserId
                )

                if (isSearchedUserStudentOfCurrentTeacher) {
                    return searchedUser
                }
            }
        }

        if (currentUser.role === Role.STUDENT && searchedUser.role === Role.TEACHER) {
            const isStudentExistInTeacherStudentsList = searchedUser.teacher.students.some(
                student => student.userId === currentUser.id
            )

            if (isStudentExistInTeacherStudentsList) {
                return searchedUser
            }
        }

        throw new BadRequestException('Пользователь не найден')
    }

    async getUsers({ role, teacherId }: { role?: Role; teacherId?: number }) {
        return this.prisma.user.findMany({
            where: {
                ...(role && { role }),
                ...(teacherId && {
                    teacher: {
                        id: teacherId,
                    },
                }),
            },
            select: {
                email: true,
                id: true,
                password: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                teacher: true,
                student: true,
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
                role: true,
                profile: this.generateProfileSelectObject(),
                teacher: true,
                student: true,
            },
        })
    }

    async createAdmin(dto: RegistrationDto) {
        const password = generateRandomPassword(12, 15)
        console.log(password)

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                role: dto.role,
                profile: this.generateProfileCreateObject(dto),
            },
            select: {
                email: true,
                id: true,
                password: true,
                role: true,
                profile: this.generateProfileSelectObject(),
            },
        })
    }
    async createStudent(dto: RegistrationStudentDto) {
        const password = generateRandomPassword(12, 15)
        console.log('student-password', password)

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                profile: this.generateProfileCreateObject(dto),
                student: {
                    create: {
                        packageTitle: dto.packageTitle,
                        languageLevel: dto.languageLevel,
                    },
                },
            },
            select: {
                email: true,
                id: true,
                password: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                student: {
                    select: {
                        id: true,
                        packageTitle: true,
                        languageLevel: true,
                    },
                },
            },
        })
    }

    async createTeacher(dto: RegistrationTeacherDto) {
        const password = generateRandomPassword(12, 15)
        console.log('teacher-password', password)

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                role: dto.role,
                profile: this.generateProfileCreateObject(dto),
                teacher: {
                    create: {
                        experience: dto.experience,
                        description: dto.description,
                        youtubeVideoId: dto.youtubeVideoId,
                        youtubeVideoPreviewUrl: dto.youtubeVideoPreviewUrl,
                    },
                },
            },
            select: {
                email: true,
                id: true,
                password: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                teacher: {
                    select: {
                        experience: true,
                        description: true,
                        youtubeVideoId: true,
                        youtubeVideoPreviewUrl: true,
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

    async getFullUserInfo(id: number) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                email: true,
                id: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                student: {
                    select: {
                        id: true,
                        packageTitle: true,
                        languageLevel: true,
                        teacherId: true,
                        // purchasedTariffs: true,
                    },
                },
                teacher: {
                    select: {
                        id: true,
                        youtubeVideoId: true,
                        youtubeVideoPreviewUrl: true,
                        experience: true,
                        description: true,
                        students: true,
                    },
                },
            },
        })
    }

    async addStudentToTeacher(teacherId: number, studentId: number) {
        const teacher = await this.prisma.teacher.findUnique({
            where: {
                id: teacherId,
            },
        })

        if (!teacher) {
            throw new BadRequestException(`Учитель не найден`)
        }

        const student = await this.prisma.student.findUnique({
            where: {
                id: studentId,
            },
        })

        if (!student) {
            throw new BadRequestException(`Студень не найден`)
        }

        return await this.prisma.teacher.update({
            where: {
                id: teacherId,
            },
            data: {
                students: {
                    connect: {
                        id: studentId,
                    },
                },
            },
        })
    }

    generateProfileCreateObject(dto: ProfileDto) {
        return {
            create: {
                name: dto.name,
                surname: dto.surname,
                patronymic: dto.patronymic,
                phone: dto.phone,
                telegram: dto.telegram,
                avatar: dto.avatar,
                birthday: dto.birthday,
            },
        }
    }

    generateProfileSelectObject() {
        return {
            select: {
                name: true,
                surname: true,
                patronymic: true,
                phone: true,
                telegram: true,
                avatar: true,
                birthday: true,
            },
        }
    }
}
