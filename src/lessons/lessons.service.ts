import { BadRequestException, Injectable } from '@nestjs/common'
import { LessonStatus, PurchasedTariff, Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { UsersService } from 'src/users/users.service'

@Injectable()
export class LessonsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService
    ) {}

    async getLessons(status?: LessonStatus) {
        if (status && status !== 'NOT_CONFIRMED') {
            throw new BadRequestException('Ошибка запроса')
        }

        return this.prisma.lesson.findMany({
            where: {
                ...(status && { lessonStatus: status }),
            },
            orderBy: {
                startDate: 'asc',
            },
        })
    }

    async getLessonsByUserId({
        userId,
        skip,
        take,
        startDate,
        endDate,
        lessonStatus,
    }: {
        userId: number
        skip?: number
        take?: number
        startDate?: Date
        endDate?: Date
        lessonStatus?: LessonStatus
    }) {
        const user = await this.usersService.getFullUserInfo(userId)

        const role = user.role === Role.TEACHER ? Role.TEACHER : Role.STUDENT
        const id = user.role === Role.TEACHER ? user.teacher.id : user.student.id

        const where = {
            ...((startDate || endDate) && {
                startDate: {
                    ...(startDate && { gte: startDate }),
                    ...(endDate && { lte: endDate }),
                },
            }),
            ...(role === Role.TEACHER ? { teacherId: id } : { studentId: id }),
            ...(lessonStatus && { lessonStatus }),
        }

        const userSelect = {
            select: {
                id: true,
                profile: {
                    select: {
                        name: true,
                        surname: true,
                        patronymic: true,
                    },
                },
            },
        }

        const [lessons, totalCount] = await Promise.all([
            this.prisma.lesson.findMany({
                where,
                select: {
                    id: true,
                    startDate: true,
                    lessonStatus: true,
                    Student: {
                        select: {
                            lessonLink: true,
                            languageLevel: true,
                            user: userSelect,
                        },
                    },
                    Teacher: {
                        select: {
                            User: userSelect,
                        },
                    },
                },
                orderBy: {
                    startDate: 'asc',
                },
                ...(skip && { skip }),
                ...(take && { take }),
            }),
            ...(skip || take
                ? [
                      this.prisma.lesson.count({
                          where,
                      }),
                  ]
                : []),
        ])

        if (lessons.length === 0) {
            return {
                teacherChats: [],
                totalCount,
            }
        }

        const response = lessons.map(chat => ({
            id: chat.id,
            startDate: chat.startDate,
            link: chat.Student.lessonLink,
            lessonStatus: chat.lessonStatus,
            student: {
                name: chat.Student.user.profile.name,
                surname: chat.Student.user.profile.surname,
                patronymic: chat.Student.user.profile.patronymic,
                languageLevel: chat.Student.languageLevel,
                userId: chat.Student.user.id,
            },
            teacher: {
                name: chat.Teacher.User.profile.name,
                surname: chat.Teacher.User.profile.surname,
                patronymic: chat.Teacher.User.profile.patronymic,
                userId: chat.Teacher.User.id,
            },
        }))

        return {
            lessons: response,
            totalCount,
        }
    }

    async create({
        teacherId,
        studentId,
        dto,
        currentUser,
        purchasedTariff,
    }: {
        teacherId: number
        studentId: number
        dto: CreateLessonDto
        currentUser: User
        purchasedTariff: PurchasedTariff
    }) {
        const lessonStatus = currentUser.role === Role.TEACHER ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON

        return this.prisma.lesson.create({
            data: {
                startDate: dto.startDate,
                lessonStatus,

                PurchasedTariff: {
                    connect: {
                        id: purchasedTariff.id,
                    },
                },
                Student: {
                    connect: {
                        id: studentId,
                    },
                },
                Teacher: {
                    connect: {
                        id: teacherId,
                    },
                },
            },
        })
    }

    async reschedule({ lessonId, dto, currentUser }: { lessonId: number; dto: CreateLessonDto; currentUser: User }) {
        const lessonStatus = currentUser.role === Role.TEACHER ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON

        return this.prisma.lesson.update({
            where: {
                id: lessonId,
            },
            data: {
                lessonStatus,
                startDate: dto.startDate,
            },
        })
    }

    async confirm(lessonId: number) {
        return this.prisma.lesson.update({
            where: {
                id: lessonId,
            },
            data: {
                lessonStatus: LessonStatus.START_SOON,
            },
        })
    }

    async delete(lessonId: number) {
        return this.prisma.lesson.delete({
            where: {
                id: lessonId,
            },
        })
    }
}
