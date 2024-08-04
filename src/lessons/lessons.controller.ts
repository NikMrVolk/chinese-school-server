import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common'
import { LessonStatus, Role, User } from '@prisma/client'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { LessonsService } from './lessons.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { StudentsService } from 'src/users/students.service'
import { LessonsCheckService } from './lessonsCheck.service'
import { Response } from 'express'

@Auth()
@Controller('lessons')
export class LessonsController {
    constructor(
        private readonly lessonsService: LessonsService,
        private readonly studentsService: StudentsService,
        private readonly lessonsCheckService: LessonsCheckService
    ) {}

    @Get()
    async getLessonsByUserId(
        @Query('userRoleId') userRoleId: string,
        @Query('role') role: Role,
        @Query('skip') skip: string,
        @Query('take') take: string,
        @Query('lessonStatus') lessonStatus: LessonStatus,
        @Query('startDate') startDate: Date,
        @Query('endDate') endDate: Date,
        @CurrentUser() currentUser: User,
        @Res({ passthrough: true }) res: Response
    ) {
        const response = await this.lessonsService.getLessons({
            userRoleId: +userRoleId,
            role: role,
            skip: +skip,
            take: +take,
            lessonStatus,
            startDate,
            endDate,
            currentUser,
        })

        const { lessons, totalCount } = response
        if (totalCount) {
            res.header('Access-Control-Expose-Headers', 'X-Total-Count')
            res.header('X-Total-Count', totalCount.toString())
        }

        return lessons
    }

    @HttpCode(200)
    @Post(':teacherId/:studentId')
    async createLesson(
        @Body() dto: CreateLessonDto,
        @CurrentUser() currentUser: User,
        @Param('teacherId') teacherId: string,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        await this.lessonsCheckService.isScheduledTimeValid(currentUser, dto)
        await this.lessonsCheckService.isLessonTimeBusy(+studentId, +teacherId, dto)

        const purchasedTariff = await this.lessonsCheckService.isStudentHasHours({ dto, studentId: +studentId })

        return this.lessonsService.create({
            teacherId: +teacherId,
            studentId: +studentId,
            dto,
            currentUser,
            purchasedTariff,
        })
    }

    @HttpCode(200)
    @Patch(':teacherId/:studentId/reschedule/:lessonId')
    async reschedule(
        @CurrentUser() currentUser: User,
        @Param('lessonId') lessonId: number,
        @Body() dto: CreateLessonDto,
        @Param('teacherId') teacherId: string,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        await this.lessonsCheckService.isScheduledTimeValid(currentUser, dto)
        await this.lessonsCheckService.isLessonTimeBusy(+studentId, +teacherId, dto)

        await this.lessonsCheckService.isStudentHasHours({ dto, studentId: +studentId, isReschedule: true })

        return this.lessonsService.reschedule({
            lessonId: +lessonId,
            dto,
            currentUser,
        })
    }

    @Admin()
    @HttpCode(200)
    @Patch(':lessonId')
    async confirm(@Param('lessonId') lessonId: number) {
        return this.lessonsService.confirm(+lessonId)
    }

    @Admin()
    @HttpCode(200)
    @Delete(':lessonId')
    async delete(@Param('lessonId') lessonId: number) {
        return this.lessonsService.delete(+lessonId)
    }
}
