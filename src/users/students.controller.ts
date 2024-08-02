import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { UpdateLessonLinkDto } from './dto/updateLessonLink.dto'
import { User } from '@prisma/client'
import { StudentsService } from './students.service'
import { UpdateNotesDto } from './dto/updateNotes.dto'
import { UpdateLanguageLevelDto } from './dto/updateLanguageLevel.dto'

@Auth()
@Controller('students')
export class StudentsController {
    constructor(private studentsService: StudentsService) {}

    @Patch(':studentId/links')
    @HttpCode(200)
    async updateLessonLink(
        @CurrentUser() currentUser: User,
        @Body() dto: UpdateLessonLinkDto,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        const { lessonLink } = await this.studentsService.updateLessonLink(+studentId, dto)

        return lessonLink
    }

    @HttpCode(200)
    @Patch(':studentId/notes')
    async updateNotes(
        @CurrentUser() currentUser: User,
        @Body() dto: UpdateNotesDto,
        @Param('studentId') studentId: string
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        const { text } = await this.studentsService.updateNotes(+studentId, dto)

        return text
    }

    @Admin()
    @HttpCode(200)
    @Patch(':studentId/levels')
    async updateLanguageLevel(@Body() dto: UpdateLanguageLevelDto, @Param('studentId') studentId: string) {
        const { languageLevel } = await this.studentsService.updateLanguageLevel(+studentId, dto)

        return languageLevel
    }
}
