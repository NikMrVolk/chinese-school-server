import { BadRequestException, Injectable } from '@nestjs/common'
import { LessonStatus, PurchasedTariff, Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { ZoomService } from './zoom/zoom.service'
import { Cron, CronExpression } from '@nestjs/schedule'
import { MailsService } from 'src/mails/mails.service'

@Injectable()
export class LessonsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly zoomService: ZoomService,
        private readonly mailsService: MailsService
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
                    lessonLink: true,
                    Student: {
                        select: {
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
            link: chat.lessonLink,
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
        lessonLink,
    }: {
        teacherId: number
        studentId: number
        dto: CreateLessonDto
        currentUser: User
        purchasedTariff: PurchasedTariff
        meetingId?: number
        lessonLink?: string
    }) {
        const lessonStatus = currentUser.role === Role.TEACHER ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON

        return this.prisma.lesson.create({
            data: {
                startDate: dto.startDate,
                lessonStatus,
                ...(meetingId && {
                    meetingId: String(meetingId),
                    lessonLink,
                }),

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
        const isTeacher = currentUser.role === Role.TEACHER
        const isAdmin = currentUser.role === Role.ADMIN
        const lessonStatus = isTeacher ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON

        const lesson = await this.prisma.lesson.findUnique({
            where: {
                id: lessonId,
            },
        })
        const meetingId = lesson.meetingId
        if (isTeacher && meetingId) {
            await this.zoomService.deleteMeeting(+meetingId)
        }

        if (isAdmin) {
            await this.zoomService.rescheduleMeeting(+meetingId, dto.startDate)

            return this.prisma.lesson.update({
                where: {
                    id: lessonId,
                },
                data: {
                    startDate: dto.startDate,
                },
            })
        }

        return this.prisma.lesson.update({
            where: {
                id: lessonId,
            },
            data: {
                lessonStatus,
                ...(isTeacher && {
                    lessonLink: null,
                    meetingId: null,
                }),
                startDate: dto.startDate,
            },
        })
    }

    async confirm(lessonId: number, currentUser: User) {
        const lesson = await this.prisma.lesson.findUnique({
            where: {
                id: lessonId,
            },
        })

        if (!lesson) {
            throw new BadRequestException('Урок не найден')
        }

        const meetingId = lesson.meetingId

        if (!meetingId) {
            const meeting = await this.createMeeting(
                { startDate: lesson.startDate.toISOString() },
                lesson.teacherId,
                lesson.studentId,
                currentUser
            )

            return this.prisma.lesson.update({
                where: {
                    id: lessonId,
                },
                data: {
                    meetingId: String(meeting.id),
                    lessonLink: meeting.join_url,
                    lessonStatus: LessonStatus.START_SOON,
                },
            })
        }

        try {
            return this.prisma.lesson.update({
                where: {
                    id: lessonId,
                },
                data: {
                    lessonStatus: LessonStatus.START_SOON,
                },
            })
        } catch (error) {
            console.error(error)
            throw new BadRequestException('Произошла ошибка при подтверждении урока')
        }
    }

    async delete(lessonId: number) {
        try {
            const lesson = await this.prisma.lesson.delete({
                where: {
                    id: lessonId,
                },
            })

            const meetingId = lesson.meetingId
            if (meetingId) {
                await this.zoomService.deleteMeeting(+meetingId)
            }

            return lesson
        } catch (error) {
            console.error(error)
            throw new BadRequestException('Произошла ошибка при удалении урока')
        }
    }

    async createMeeting(dto: CreateLessonDto, teacherId: number, studentId: number, currentUser: User) {
        if (currentUser.role !== Role.ADMIN) {
            return null
        }

        return this.zoomService.createMeeting(dto, teacherId, studentId)
    }

    @Cron(CronExpression.EVERY_HOUR)
    async changeLessonStatusToProcess() {
        const currentDate = new Date()
        currentDate.setHours(currentDate.getHours(), 0, 0, 0)

        const purchasedTariffs = await this.prisma.lesson.findMany({
            where: {
                startDate: currentDate.toISOString(),
            },
            select: {
                PurchasedTariff: {
                    select: {
                        id: true,
                    },
                },
            },
        })

        const ids = purchasedTariffs.map(purchasedTariff => purchasedTariff.PurchasedTariff.id)

        await Promise.all(
            ids.map(async id => {
                const purchasedTariff = await this.prisma.purchasedTariff.update({
                    where: { id },
                    data: { completedHours: { increment: 1 } },
                })

                if (purchasedTariff.completedHours === purchasedTariff.quantityHours - 4) {
                    const {
                        user: { id, email },
                    } = await this.prisma.student.findUnique({
                        where: {
                            id: purchasedTariff.studentId,
                        },
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                },
                            },
                        },
                    })

                    if (id && email) {
                        this.mailsService.sendStudentNotificationWithFewLessons(
                            email,
                            `${process.env.CLIENT_URL}/tariffs/${id}`
                        )
                    }
                }

                if (purchasedTariff.completedHours >= purchasedTariff.quantityHours) {
                    const allUsersTariffs = await this.prisma.purchasedTariff.findMany({
                        where: {
                            studentId: purchasedTariff.studentId,
                        },
                    })

                    const tariffWithHours = allUsersTariffs.find(tariff => tariff.completedHours < tariff.quantityHours)

                    if (tariffWithHours) {
                        const currentDate = new Date()
                        const daysToAdd = 7 * tariffWithHours.quantityWeeksActive
                        const expiredIn = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

                        await this.prisma.purchasedTariff.update({
                            where: {
                                id: tariffWithHours.id,
                            },
                            data: {
                                expiredIn,
                            },
                        })
                    }
                }
            })
        )
    }
}
