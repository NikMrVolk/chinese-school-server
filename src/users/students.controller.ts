import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { Auth, CurrentUser } from 'src/utils/decorators'
import { UpdateLessonLinkDto } from './dto/updateLessonLink.dto'
import { User } from '@prisma/client'
import { StudentsService } from './students.service'

@Auth()
@Controller('students')
export class StudentsController {
    constructor(private studentsService: StudentsService) {}

    @Patch(':studentId/link')
    @HttpCode(200)
    async updateLessonLink(
        @CurrentUser() currentUser: User,
        @Body() dto: UpdateLessonLinkDto,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        const response = await this.studentsService.updateLessonLink(+studentId, dto)

        return response.lessonLink
    }
}
