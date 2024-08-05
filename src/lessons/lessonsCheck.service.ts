import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { LessonStatus, Role, User } from '@prisma/client'

@Injectable()
export class LessonsCheckService {
    constructor(private readonly prisma: PrismaService) {}

    async isLessonTimeBusy(studentId: number, teacherId: number, dto: CreateLessonDto) {
        const studentLesson = await this.prisma.lesson.findFirst({
            where: {
                studentId,
                startDate: {
                    equals: dto.startDate,
                },
            },
        })

        if (studentLesson) {
            throw new BadRequestException('На данное время у ученика уже запланировано занятие')
        }

        const teacherLesson = await this.prisma.lesson.findFirst({
            where: {
                teacherId,
                startDate: {
                    equals: dto.startDate,
                },
            },
        })

        if (teacherLesson) {
            throw new BadRequestException('На данное время у учителя уже запланировано занятие')
        }
    }

    async isStudentHasHours({
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

    async isScheduledTimeValid(currentUser: User, dto: CreateLessonDto) {
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

    private async getStudentActiveTariff(studentId: number, isReschedule?: boolean) {
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
            const paymentStatusSuccess = tariff.paymentStatus === 'succeeded'
            const notExpired = new Date().getDate() < new Date(tariff.expiredIn ? tariff.expiredIn : 0).getDate()

            return isHoursEnded && paymentStatusSuccess && notExpired
        })

        return activeTariff
    }

    private async getAllStudentScheduledLessons(studentId: number) {
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
}
