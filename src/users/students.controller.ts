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
    Post,
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
import { UpdatePackageDto } from './dto/updatePackage.dto'
import { FreeLessonInviteDto } from './dto/freeLessonInvite.dto'

@Controller('students')
export class StudentsController {
    constructor(private studentsService: StudentsService) {}

    @Auth()
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

    @Auth()
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

    @Auth()
    @Admin()
    @HttpCode(200)
    @Patch(':studentId/levels')
    async updateLanguageLevel(@Body() dto: UpdateLanguageLevelDto, @Param('studentId') studentId: string) {
        const { languageLevel } = await this.studentsService.updateLanguageLevel(+studentId, dto)

        return languageLevel
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Patch(':studentId/package')
    async updatePackage(@Body() dto: UpdatePackageDto, @Param('studentId') studentId: string) {
        const { languageLevel } = await this.studentsService.updatePackage(+studentId, dto)

        return languageLevel
    }

    @Auth()
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

    @Auth()
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

    @HttpCode(200)
    @Post('free-lesson-invite')
    async freeLessonInvite(@Body() dto: FreeLessonInviteDto) {
        console.log(dto)
        return this.studentsService.freeLessonInvite(dto)
    }
}
