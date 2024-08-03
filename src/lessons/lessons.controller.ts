import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { User } from '@prisma/client'
import { Auth, CurrentUser } from 'src/utils/decorators'
import { LessonsService } from './lessons.service'
import { CreateLessonDto } from './dto/lesson.dto'
import { StudentsService } from 'src/users/students.service'

@Auth()
@Controller('lessons')
export class LessonsController {
    constructor(
        private readonly lessonsService: LessonsService,
        private readonly studentsService: StudentsService
    ) {}

    // @Admin()
    // @HttpCode(200)
    // @Get()
    // async getUserLessons(
    //     @Param('id') userId: string,
    //     @Query()
    //     query: {
    //         startDate?: Date
    //         endDate?: Date
    //         isUpcoming?: boolean
    //     }
    // ) {
    //     return this.lessonsService.getUserLessons({ userId, query })
    // }

    @HttpCode(200)
    @Post(':teacherId/:studentId')
    async createLesson(
        @Body() dto: CreateLessonDto,
        @CurrentUser() currentUser: User,
        @Param('teacherId') teacherId: string,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        await this.lessonsService.checkScheduledTime(currentUser, dto)
        await this.lessonsService.checkIsLessonTimeBusy(+studentId, +teacherId, dto)

        const purchasedTariff = await this.lessonsService.checkIsStudentHasHours({ dto, studentId: +studentId })

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
        await this.lessonsService.checkScheduledTime(currentUser, dto)
        await this.lessonsService.checkIsLessonTimeBusy(+studentId, +teacherId, dto)

        await this.lessonsService.checkIsStudentHasHours({ dto, studentId: +studentId, isReschedule: true })

        return this.lessonsService.reschedule({
            lessonId: +lessonId,
            dto,
            currentUser,
        })
    }

    // @Admin()
    // @HttpCode(200)
    // @Patch(':id/confirm')
    // async confirm(@Param('id') lessonId: number) {
    //     return this.lessonsService.confirm(+lessonId)
    // }

    // @Admin()
    // @HttpCode(200)
    // @Delete(':id')
    // async delete(@Param('id') lessonId: number) {}
}
