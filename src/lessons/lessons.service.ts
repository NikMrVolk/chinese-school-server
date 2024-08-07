import { BadRequestException, Injectable } from '@nestjs/common'
import { LessonStatus, PurchasedTariff, Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { ZoomService } from './zoom/zoom.service'

@Injectable()
export class LessonsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly zoomService: ZoomService
    ) {}

    async getLessons({
        userRoleId,
        role,
        skip,
        take,
        startDate,
        endDate,
        lessonStatus,
        currentUser,
    }: {
        userRoleId?: number
        role: Role
        skip?: number
        take?: number
        startDate?: Date
        endDate?: Date
        lessonStatus?: LessonStatus[]
        currentUser: User
    }) {
        if (!userRoleId && !role && currentUser.role !== Role.ADMIN) {
            throw new BadRequestException('Ошибка запроса')
        }

        const where = {
            ...((startDate || endDate) && {
                startDate: {
                    ...(startDate && { gte: startDate }),
                    ...(endDate && { lte: endDate }),
                },
            }),
            ...(role &&
                userRoleId && {
                    ...(role === Role.TEACHER && {
                        teacherId: userRoleId,
                    }),
                    ...(role === Role.STUDENT && {
                        studentId: userRoleId,
                    }),
                }),
            ...(lessonStatus.length > 0 && {
                ...(lessonStatus.length === 1 && {
                    lessonStatus: lessonStatus[0],
                }),
                ...(lessonStatus.length > 1 && {
                    lessonStatus: { in: lessonStatus },
                }),
            }),
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
                lessons: [],
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
        meetingId,
    }: {
        teacherId: number
        studentId: number
        dto: CreateLessonDto
        currentUser: User
        purchasedTariff: PurchasedTariff
        meetingId: number
    }) {
        const lessonStatus = currentUser.role === Role.TEACHER ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON

        console.log(meetingId)
        console.log(typeof meetingId)

        return this.prisma.lesson.create({
            data: {
                startDate: dto.startDate,
                lessonStatus,
                meetingId: String(meetingId),

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
        try {
            const lesson = await this.prisma.lesson.update({
                where: {
                    id: lessonId,
                },
                data: {
                    lessonStatus: LessonStatus.START_SOON,
                },
            })

            return lesson
        } catch (error) {
            console.error(error)
            throw new BadRequestException('Произошла ошибка при подтверждении урока')
        }

        return
    }

    async delete(lessonId: number) {
        try {
            const lesson = await this.prisma.lesson.delete({
                where: {
                    id: lessonId,
                },
            })

            return lesson
        } catch (error) {
            console.error(error)
            throw new BadRequestException('Произошла ошибка при удалении урока')
        }
    }

    async createMeeting(dto: CreateLessonDto, teacherId: number, studentId: number, currentUser: User) {
        if (currentUser.role !== Role.ADMIN) {
            return
        }

        return this.zoomService.createMeeting(dto, teacherId, studentId)
    }
}
