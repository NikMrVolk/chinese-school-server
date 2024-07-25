import { BadRequestException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma.service'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from '../auth/dto/registration.dto'
import { Role, User } from '@prisma/client'
import { generateRandomPassword } from 'src/utils/helpers'
import { ProfileDto } from 'src/auth/dto/profile.dto'
import { ChangeProfileDto } from './dto/ChangeProfile.dto'
import { MailsService } from 'src/mails/mails.service'
import { FilesService } from 'src/files/files.service'

@Injectable()
export class UsersService {
    constructor(
        private mailsService: MailsService,
        private prisma: PrismaService,
        private filesService: FilesService
    ) {}

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
            const teacher = await this.getFullUserInfo(currentUser.id)

            const allStudentsOfCurrentTeacher = await this.getAllStudentsOfOneTeacher(teacher.teacher.id)

            if (allStudentsOfCurrentTeacher.length > 0) {
                const isSearchedUserStudentOfCurrentTeacher = allStudentsOfCurrentTeacher.some(
                    student => student.id === searchedUserId
                )

                if (isSearchedUserStudentOfCurrentTeacher) {
                    return searchedUser
                }
            }
        }

        throw new BadRequestException('Пользователь не найден')
    }

    async getUsers({ role, teacherId }: { role?: Role; teacherId?: number }) {
        return this.prisma.user.findMany({
            where: {
                ...(role && { role }),
                ...(teacherId && {
                    student: {
                        teacherId: teacherId,
                    },
                }),
            },
            select: {
                email: true,
                id: true,
                password: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                teacher: {
                    select: {
                        id: true,
                        experience: true,
                        description: true,
                        youtubeVideoId: true,
                        youtubeVideoPreviewUrl: true,
                        students: true,
                    },
                },
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

    async createAdmin(dto: RegistrationDto, avatar?: Express.Multer.File) {
        const password = generateRandomPassword(12, 15)
        this.mailsService.sendRegistrationMail(dto.email, password)
        let fileName: string
        if (avatar) {
            fileName = await this.filesService.createFile(avatar)
        }

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                role: Role.ADMIN,
                profile: {
                    create: {
                        name: dto.name,
                        surname: dto.surname,
                        patronymic: dto.patronymic,
                        phone: dto.phone,
                        telegram: dto.telegram,
                        ...(avatar && { avatar: fileName }),
                        ...(dto.birthday && { birthday: dto.birthday }),
                    },
                },
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
                role: Role.TEACHER,
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
        return this.prisma.user.findMany({
            where: {
                student: {
                    teacherId,
                },
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
                    },
                },
            },
        })
    }

    async getFullUserInfo(id: number, email?: string) {
        return this.prisma.user.findUnique({
            where: {
                ...(id && { id }),
                ...(email && { email }),
            },
            select: {
                email: true,
                id: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                otps: true,
                session: true,
                password: true,
                passwordReset: true,
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

    public async changeProfile({
        currentUser,
        changeUserId,
        dto,
        avatar,
    }: {
        currentUser: User
        changeUserId: number
        dto: ChangeProfileDto
        avatar?: Express.Multer.File
    }) {
        const changeUser = await this.getFullUserInfo(changeUserId)

        if (!changeUser) {
            throw new BadRequestException('Пользователь не найден')
        }

        if (changeUser.email !== dto.email) {
            await this.validateEmail(dto.email)
        }

        const currentUserAvatar = changeUser.profile.avatar
        if (changeUser.id === currentUser.id) {
            return this.updateUserProfile(changeUserId, dto, avatar, currentUserAvatar)
        }
        if (currentUser.role === Role.ADMIN) {
            return this.updateUserProfile(changeUserId, dto, avatar, currentUserAvatar)
        }

        throw new BadRequestException('Не удалось изменить данные')
    }

    private async updateUserProfile(
        userId: number,
        dto: ChangeProfileDto,
        avatar?: Express.Multer.File,
        currentUserAvatar?: string
    ) {
        let fileName: string
        if (avatar) {
            if (currentUserAvatar) {
                await this.filesService.deleteFile(currentUserAvatar)
            }
            fileName = await this.filesService.createFile(avatar)
        }

        return await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                email: dto.email,
                profile: {
                    update: {
                        name: dto.name,
                        surname: dto.surname,
                        patronymic: dto.patronymic,
                        phone: dto.phone,
                        telegram: dto.telegram,
                        ...(avatar && { avatar: fileName }),
                        ...(dto.birthday && { birthday: dto.birthday }),
                    },
                },
            },
            select: {
                email: true,
                id: true,
                role: true,
                profile: this.generateProfileSelectObject(),
                teacher: {
                    select: {
                        id: true,
                        experience: true,
                        description: true,
                        youtubeVideoId: true,
                        youtubeVideoPreviewUrl: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        packageTitle: true,
                        languageLevel: true,
                        teacherId: true,
                    },
                },
            },
        })
    }

    async validateEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email,
            },
        })

        if (user) throw new BadRequestException(`Пользователь с почтой ${email} уже существует`)
    }

    generateProfileCreateObject(dto: ProfileDto) {
        return {
            create: {
                name: dto.name,
                surname: dto.surname,
                patronymic: dto.patronymic,
                phone: dto.phone,
                telegram: dto.telegram,
                // avatar: dto.avatar,
                // birthday: dto.birthday,
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
