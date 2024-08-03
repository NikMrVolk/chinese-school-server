import { Injectable } from '@nestjs/common'
import { LessonStatus, PurchasedTariff, Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { CreateLessonDto } from './dto/lesson.dto'

@Injectable()
export class LessonsService {
    constructor(private readonly prisma: PrismaService) {}

    // async getUserLessons({
    //     userId,
    //     query,
    // }: {
    //     userId: string
    //     query: {
    //         startDate?: Date
    //         endDate?: Date
    //         isUpcoming?: boolean
    //     }
    // }) {
    //     const user = await this.prisma.user.findUnique({
    //         where: {
    //             id: +userId,
    //         },
    //     })

    //     if (!user) {
    //         throw new BadRequestException('Невозможно найти занятия указанного пользователя')
    //     }

    //     const currentTimePlusOneHour = new Date()
    //     currentTimePlusOneHour.setHours(currentTimePlusOneHour.getHours() + 1)

    //     return this.prisma.lesson.findMany({
    //         where: {
    //             [user.role === Role.STUDENT ? 'studentId' : 'teacherId']: user.id,
    //             ...(query.startDate &&
    //                 query.endDate && {
    //                     startDate: {
    //                         gte: query.startDate,
    //                         lte: query.endDate,
    //                     },
    //                 }),
    //             ...(query.isUpcoming && {
    //                 startDate: {
    //                     gte: currentTimePlusOneHour,
    //                 },
    //             }),
    //         },
    //         orderBy: {
    //             startDate: 'asc',
    //         },
    //     })
    // }

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
