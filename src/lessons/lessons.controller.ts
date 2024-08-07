import { Body, Controller, Delete, Get, HttpCode, Param, ParseArrayPipe, Patch, Post, Query, Res } from '@nestjs/common'
import { LessonStatus, Role, User } from '@prisma/client'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { LessonsService } from './lessons.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { StudentsService } from 'src/users/students.service'
import { LessonsCheckService } from './lessonsCheck.service'
import { Response } from 'express'
import { EndedLessonWebhook } from './webhook.types'
import { ZoomService } from './zoom/zoom.service'
import { createHmac } from 'node:crypto'

@Controller('lessons')
export class LessonsController {
    constructor(
        private readonly lessonsService: LessonsService,
        private readonly studentsService: StudentsService,
        private readonly lessonsCheckService: LessonsCheckService,
        private readonly zoomService: ZoomService
    ) {}

    @Auth()
    @Get()
    async getLessonsByUserId(
        @Query('userRoleId') userRoleId: string,
        @Query('role') role: Role,
        @Query('skip') skip: string,
        @Query('take') take: string,
        @Query('lessonStatus', new ParseArrayPipe({ separator: ',' }))
        lessonStatus: LessonStatus[],
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

    @Auth()
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

        const lesson = await this.lessonsService.create({
            teacherId: +teacherId,
            studentId: +studentId,
            dto,
            currentUser,
            purchasedTariff,
        })

        await this.lessonsService.createMeeting(lesson, currentUser)

        return lesson
    }

    @Auth()
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

    @Auth()
    @Admin()
    @HttpCode(200)
    @Patch(':lessonId')
    async confirm(@Param('lessonId') lessonId: number) {
        return this.lessonsService.confirm(+lessonId)
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Delete(':lessonId')
    async delete(@Param('lessonId') lessonId: number) {
        return this.lessonsService.delete(+lessonId)
    }

    @HttpCode(200)
    @Post('webhook')
    async webhook(@Body() dto: EndedLessonWebhook, @Res() res: Response) {
        if ('plainToken' in dto.payload) {
            const plainToken = dto.payload.plainToken

            const hmac = createHmac('sha256', process.env.ZOOM_CLIENT_SECRET)
            hmac.update(plainToken)
            const encryptedToken = hmac.digest('hex')

            console.log({
                plainToken,
                encryptedToken,
            })

            return res.status(200).json({
                plainToken,
                encryptedToken,
            })
        }

        return this.zoomService.lessonEnded(dto)
    }
}
