import {
    Body,
    Controller,
    Delete,
    FileTypeValidator,
    HttpCode,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Patch,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { UpdateLessonLinkDto } from './dto/updateLessonLink.dto'
import { User } from '@prisma/client'
import { StudentsService } from './students.service'
import { UpdateNotesDto } from './dto/updateNotes.dto'
import { UpdateLanguageLevelDto } from './dto/updateLanguageLevel.dto'
import { FilesInterceptor } from '@nestjs/platform-express'

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

    @HttpCode(200)
    @UseInterceptors(FilesInterceptor('files'))
    @Patch(':studentId/homeworks')
    async updateHomeworks(
        @CurrentUser() currentUser: User,
        @Param('studentId') studentId: string,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024, message: 'Файл слишком большой' }),
                    new FileTypeValidator({
                        fileType: '.(jpg|jpeg|png|doc|docx|ppt|pptx|xls|xlsx|pdf)',
                    }),
                ],
            })
        )
        files: Array<Express.Multer.File>
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        return this.studentsService.updateHomeWork(+studentId, files)
    }

    @HttpCode(200)
    @Delete(':studentId/homeworks/:homeworkId')
    async deleteHomework(
        @Param('studentId') studentId: string,
        @Param('homeworkId') homeworkId: string,
        @CurrentUser() currentUser: User
    ) {
        await this.studentsService.isCurrentTeacherHaveThisStudent(currentUser, +studentId)
        return this.studentsService.deleteHomeWork(+studentId, +homeworkId)
    }
}
