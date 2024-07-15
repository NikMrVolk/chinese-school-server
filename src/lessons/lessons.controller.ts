import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common'
import { User } from '@prisma/client'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { LessonsService } from './lessons.service'
import { LessonDto } from './dto/lesson.dto'

@Auth()
@Controller('lessons')
export class LessonsController {
    constructor(private readonly lessonsService: LessonsService) {}

    @HttpCode(200)
    @Get(':id')
    async getUserLessons(
        @Param('id') userId: string,
        @Query()
        query: {
            startDate?: Date
            endDate?: Date
            isUpcoming?: boolean
        }
    ) {
        return this.lessonsService.getUserLessons({ userId, query })
    }

    @HttpCode(200)
    @Post()
    async create(@CurrentUser() currentUser: User, @Body() dto: LessonDto) {
        return this.lessonsService.create(currentUser, dto)
    }

    @HttpCode(200)
    @Put('reschedule/:id')
    async reschedule(@CurrentUser() currentUser: User, @Param('id') lessonId: number, @Body() dto: LessonDto) {
        return this.lessonsService.reschedule(currentUser, lessonId, dto)
    }

    @Admin()
    @HttpCode(200)
    @Put('confirm/:id')
    async confirm(@Param('id') lessonId: number) {
        return this.lessonsService.confirm(+lessonId)
    }
}
