import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma.service'
import { RegistrationDto, RegistrationStudentDto, RegistrationTeacherDto } from '../auth/dto/registration.dto'
import { LessonStatus, Role, Tariff, User } from '@prisma/client'
import { generateRandomPassword } from 'src/utils/helpers'
import { ProfileDto } from 'src/auth/dto/profile.dto'
import { ChangeProfileDto } from './dto/ChangeProfile.dto'
import { MailsService } from 'src/mails/mails.service'
import { FilesService } from 'src/files/files.service'
import { ChangeTeacherInfoDto } from './dto/changeTeacherInfo.dto'
import { ChatsService } from 'src/chats/chats.service'
import { TransactionService } from 'src/transaction/transaction.service'

@Injectable()
export class UsersService {
    constructor(
        private mailsService: MailsService,
        private prisma: PrismaService,
        private filesService: FilesService,
        private chatsService: ChatsService,
        private transactionService: TransactionService
    ) {}

    async getCurrentUser({ currentUser, searchedUserId }: { currentUser: User; searchedUserId: number }) {
        if (!searchedUserId || !currentUser) {
            throw new ForbiddenException('Ошибка запроса')
        }

        if (currentUser.id === searchedUserId) {
            return this.getFullUserInfo(currentUser.id)
        }

        const searchedUser = await this.getFullUserInfo(searchedUserId)

        if (!searchedUser) {
            throw new ForbiddenException('Пользователь не найден')
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

    async getUsers({
        role,
        teacherId,
        withoutTeacher,
        skip,
        take,
    }: {
        role?: Role
        teacherId?: number
        withoutTeacher?: boolean
        skip?: number
        take?: number
    }) {
        const where = {
            ...(role && { role }),
            ...(teacherId && {
                student: {
                    teacherId: teacherId,
                },
            }),
            ...(withoutTeacher && {
                student: {
                    Teacher: null,
                },
            }),
        }

        const select = {
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
                    teacherId: true,
                    ...(teacherId && {
                        lessons: {
                            select: {
                                startDate: true,
                            },
                            where: {
                                lessonStatus: LessonStatus.START_SOON,
                                startDate: {
                                    gt: new Date(),
                                },
                            },
                            take: 1,
                        },
                    }),
                },
            },
        }

        const [users, totalCount] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select,
                orderBy: {
                    profile: {
                        surname: 'asc',
                    },
                },
                ...(skip && { skip }),
                ...(take && { take }),
            }),
            ...(skip || take
                ? [
                      this.prisma.user.count({
                          where,
                      }),
                  ]
                : []),
        ])

        return { users, totalCount }
    }

    async getTeacherInfo(teacherId: number, currentUser: User) {
        if (currentUser.role === Role.TEACHER) {
            throw new BadRequestException('Ошибка запроса')
        }

        const teacher = await this.prisma.teacher.findUnique({
            where: {
                id: teacherId,
            },
            include: {
                User: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        profile: {
                            select: {
                                name: true,
                                surname: true,
                                patronymic: true,
                                avatar: true,
                                phone: true,
                                telegram: true,
                                birthday: true,
                            },
                        },
                        teacher: {
                            select: {
                                experience: true,
                                description: true,
                                youtubeVideoId: true,
                                youtubeVideoPreviewUrl: true,
                            },
                        },
                        student: true,
                    },
                },
            },
        })

        if (!teacher) {
            return null
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { User, ...teacherInfo } = teacher

        return User
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

    async deleteOne(id: number) {
        const user = await this.getFullUserInfo(id)

        if (user.profile.avatar) {
            await this.filesService.deleteFile(user.profile.avatar)
        }

        if (user.role === Role.TEACHER && user.teacher.youtubeVideoPreviewUrl) {
            await this.filesService.deleteFile(user.teacher.youtubeVideoPreviewUrl)
        }

        return this.prisma.user.delete({
            where: {
                id,
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

    async createStudent(dto: RegistrationStudentDto, tariff: Tariff, avatar?: Express.Multer.File) {
        let fileName: string
        if (avatar) {
            fileName = await this.filesService.createFile(avatar)
        }

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: null,
                profile: {
                    create: {
                        name: dto.name,
                        surname: dto.surname,
                        patronymic: dto.patronymic,
                        phone: dto.phone,
                        telegram: dto.telegram,
                        birthday: dto.birthday,
                        ...(avatar && { avatar: fileName }),
                    },
                },
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

        const { confirmationToken } = await this.transactionService.makePayment({
            userId: user.id,
            tariffId: tariff.id,
        })

        this.mailsService.sendPaymentLinkMail(user.email, `${process.env.CLIENT_URL}/payment/${confirmationToken}`)

        return user
    }

    async createTeacher(
        dto: RegistrationTeacherDto,
        files: { avatar?: Express.Multer.File; youtubeVideoPreviewUrl?: Express.Multer.File }
    ) {
        const password = generateRandomPassword(12, 15)
        this.mailsService.sendRegistrationMail(dto.email, password)

        let avatarFileName: string
        if (files.avatar && files.avatar[0]) {
            avatarFileName = await this.filesService.createFile(files.avatar[0])
        }
        let youtubeVideoPreviewUrlFileName: string
        if (files.youtubeVideoPreviewUrl && files.youtubeVideoPreviewUrl[0]) {
            youtubeVideoPreviewUrlFileName = await this.filesService.createFile(files.youtubeVideoPreviewUrl[0])
        }

        return this.prisma.user.create({
            data: {
                email: dto.email,
                password: await bcrypt.hash(password, 7),
                role: Role.TEACHER,
                profile: {
                    create: {
                        name: dto.name,
                        surname: dto.surname,
                        patronymic: dto.patronymic,
                        phone: dto.phone,
                        telegram: dto.telegram,
                        ...(avatarFileName && { avatar: avatarFileName }),
                        ...(dto.birthday && { birthday: dto.birthday }),
                    },
                },
                teacher: {
                    create: {
                        experience: +dto.experience,
                        description: dto.description,
                        youtubeVideoId: dto.youtubeVideoId,
                        ...(youtubeVideoPreviewUrlFileName && {
                            youtubeVideoPreviewUrl: youtubeVideoPreviewUrlFileName,
                        }),
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
        const user = await this.prisma.user.findUnique({
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
                        lessonLink: true,
                        packageTitle: true,
                        languageLevel: true,
                        teacherId: true,
                        purchasedTariffs: true,
                        homeworks: true,
                        Note: {
                            select: {
                                id: true,
                                text: true,
                            },
                        },
                        chat: {
                            select: {
                                id: true,
                            },
                        },
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

        if (!user) {
            throw new BadRequestException('Пользователь не найден')
        }

        return user
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

        if (student.teacherId) {
            throw new BadRequestException(`У данного студента уже есть учитель`)
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
                chats: {
                    create: {
                        studentId: studentId,
                    },
                },
                notes: {
                    create: {
                        studentId: studentId,
                        text: '',
                    },
                },
            },
        })
    }

    async deleteStudentFromTeacher(studentId: number) {
        const student = await this.prisma.student.findUnique({
            where: {
                id: studentId,
            },
            select: {
                teacherId: true,
                chat: true,
            },
        })

        if (!student) {
            throw new BadRequestException(`Студень не найден`)
        }

        if (!student.teacherId) {
            throw new BadRequestException(`У данного студента нет учителя`)
        }

        this.chatsService.deleteChatWithMessages(student.chat.id)

        return await this.prisma.student.update({
            where: {
                id: studentId,
            },
            data: {
                Teacher: {
                    disconnect: true,
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
                        birthday: dto.birthday,
                        ...(avatar && { avatar: fileName }),
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

    async updateTeacherInfo({
        changeUserId,
        dto,
        youtubeVideoPreviewUrl,
    }: {
        changeUserId: number
        dto: ChangeTeacherInfoDto
        youtubeVideoPreviewUrl?: Express.Multer.File
    }) {
        const changeUser = await this.getFullUserInfo(changeUserId)
        if (!changeUser) throw new BadRequestException('Пользователь не найден')

        let previewFileUrl: string
        const currentVideoPreviewFileUrl = changeUser.teacher.youtubeVideoPreviewUrl
        if (youtubeVideoPreviewUrl) {
            if (currentVideoPreviewFileUrl) {
                await this.filesService.deleteFile(currentVideoPreviewFileUrl)
            }
            previewFileUrl = await this.filesService.createFile(youtubeVideoPreviewUrl)
        }

        return await this.prisma.teacher.update({
            where: {
                id: changeUser.teacher.id,
            },
            data: {
                experience: +dto.experience,
                description: dto.description,
                youtubeVideoId: dto.youtubeVideoId,
                ...(previewFileUrl && { youtubeVideoPreviewUrl: previewFileUrl }),
            },
            select: {
                id: true,
                experience: true,
                description: true,
                youtubeVideoId: true,
                youtubeVideoPreviewUrl: true,
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
                id: true,
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
