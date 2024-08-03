import { BadRequestException, Injectable } from '@nestjs/common'
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

    async checkIsLessonTimeBusy(studentId: number, teacherId: number, dto: CreateLessonDto) {
        const lesson = await this.prisma.lesson.findFirst({
            where: {
                studentId,
                teacherId,
                startDate: {
                    equals: dto.startDate,
                },
            },
        })

        if (lesson) {
            throw new BadRequestException('На данное время уже запланировано занятие')
        }
    }

    async checkIsStudentHasHours({
        studentId,
        dto,
        isReschedule = false,
    }: {
        studentId: number
        dto: CreateLessonDto
        isReschedule?: boolean
    }) {
        const activeTariff = await this.getStudentActiveTariff(studentId, isReschedule)

        if (!activeTariff) {
            throw new BadRequestException('У студента закончились часы или срок действия тарифа')
        }

        if (activeTariff.expiredIn.getTime() < new Date(dto.startDate).getTime()) {
            throw new BadRequestException('В указанную дату у студента закончится срок действия тарифа')
        }

        return activeTariff
    }

    async getStudentActiveTariff(studentId: number, isReschedule?: boolean) {
        const purchasedTariffs = await this.prisma.purchasedTariff.findMany({
            where: {
                studentId,
            },
        })

        if (!purchasedTariffs.length) {
            throw new BadRequestException('У студента нет активированных тарифов')
        }

        const scheduledLessons = await this.getAllStudentScheduledLessons(+studentId)

        const activeTariff = purchasedTariffs?.find(tariff => {
            const totalReservedHours = tariff.completedHours + scheduledLessons.length - (isReschedule ? 1 : 0)

            const isHoursEnded = totalReservedHours < tariff.quantityHours
            const paymentStatusSuccess = tariff.paymentStatus === 'SUCCESS'
            const notExpired = new Date().getDate() < new Date(tariff.expiredIn ? tariff.expiredIn : 0).getDate()

            return isHoursEnded && paymentStatusSuccess && notExpired
        })

        return activeTariff
    }

    async getAllStudentScheduledLessons(studentId: number) {
        const currentDate = new Date()
        currentDate.setHours(currentDate.getHours() - 1)

        const scheduledLessons = await this.prisma.lesson.findMany({
            where: {
                studentId,
                startDate: {
                    gte: currentDate,
                },
                lessonStatus: {
                    not: {
                        in: [LessonStatus.ALL_SUCCESS, LessonStatus.UN_SUCCESS],
                    },
                },
            },
        })

        return scheduledLessons
    }

    async checkScheduledTime(currentUser: User, dto: CreateLessonDto) {
        const isCurrentUserAdmin = currentUser.role === Role.ADMIN

        if (new Date(dto.startDate).getTime() < new Date().getTime()) {
            throw new BadRequestException('Вы не можете запланировать занятие в прошлом')
        }

        const dateFromDto = new Date(dto.startDate)
        const minutes = dateFromDto.getMinutes()
        const seconds = dateFromDto.getSeconds()
        const milliseconds = dateFromDto.getMilliseconds()

        if (minutes !== 0 || seconds !== 0 || milliseconds !== 0) {
            throw new BadRequestException('Вы не можете запланировать занятие не в начале часа')
        }

        if (isCurrentUserAdmin) {
            const halfYearAdd = new Date()
            halfYearAdd.setMonth(halfYearAdd.getMonth() + 6)
            if (dateFromDto.getTime() > halfYearAdd.getTime()) {
                throw new BadRequestException('Вы не можете запланировать занятие позже чем на 6 месяцев вперёд')
            }

            return
        }

        const twoWeeksAhead = new Date()
        twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14)
        if (dateFromDto.getTime() > twoWeeksAhead.getTime()) {
            throw new BadRequestException('Вы не можете запланировать занятие позже чем на 2 недели вперёд')
        }
    }
}
