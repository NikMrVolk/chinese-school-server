import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { LessonStatus, Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { LessonDto } from './dto/lesson.dto'

@Injectable()
export class LessonsService {
    constructor(private readonly prisma: PrismaService) {}

    async getUserLessons({
        userId,
        query,
    }: {
        userId: string
        query: {
            startDate?: Date
            endDate?: Date
            isUpcoming?: boolean
        }
    }) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: +userId,
            },
        })

        if (!user) {
            throw new BadRequestException('Невозможно найти занятия указанного пользователя')
        }

        const currentTimePlusOneHour = new Date()
        currentTimePlusOneHour.setHours(currentTimePlusOneHour.getHours() + 1)

        return this.prisma.lesson.findMany({
            where: {
                [user.role === Role.STUDENT ? 'studentId' : 'teacherId']: user.id,
                ...(query.startDate &&
                    query.endDate && {
                        startDate: {
                            gte: query.startDate,
                            lte: query.endDate,
                        },
                    }),
                ...(query.isUpcoming && {
                    startDate: {
                        gte: currentTimePlusOneHour,
                    },
                }),
            },
            orderBy: {
                startDate: 'asc',
            },
        })
    }

    async create(currentUser: User, dto: LessonDto) {
        await this.isScheduledForSelectedDate(dto)

        if (currentUser.role === Role.STUDENT) throw new ForbiddenException('Вы не можете создавать занятия')

        return this.prisma.lesson.create({
            data: {
                studentId: dto.studentId,
                teacherId: dto.teacherId,
                startDate: dto.startDate,
                lessonStatus: currentUser.role === Role.TEACHER ? LessonStatus.NOT_CONFIRMED : LessonStatus.START_SOON,
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

    async reschedule(currentUser: User, lessonId: number, dto: LessonDto) {
        await this.isScheduledForSelectedDate(dto)

        return this.prisma.lesson.update({
            where: {
                id: lessonId,
            },
            data: {
                startDate: dto.startDate,
                lessonStatus: currentUser.role === Role.ADMIN ? LessonStatus.START_SOON : LessonStatus.NOT_CONFIRMED,
            },
        })
    }

    async isScheduledForSelectedDate(dto: LessonDto) {
        const lesson = await this.prisma.lesson.findFirst({
            where: {
                studentId: dto.studentId,
                teacherId: dto.teacherId,
                startDate: {
                    equals: dto.startDate,
                },
            },
        })

        if (lesson) throw new BadRequestException('На данную дату уже запланировано занятие')
    }
}
