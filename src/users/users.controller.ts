import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import { UsersService } from './users.service'

import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { Role, User } from '@prisma/client'
import { Response, Express } from 'express'
import { ChangeProfileDto } from './dto/ChangeProfile.dto'
import { CheckEmailDto } from './dto/CheckEmail.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { ChangeTeacherInfoDto } from './dto/changeTeacherInfo.dto'

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @HttpCode(200)
    @Get()
    async getAllUsers(
        @Query('role') role: Role,
        @Query('teacherId') teacherId: string,
        @Query('withoutTeacher') withoutTeacher: boolean
    ) {
        return this.usersService.getUsers({ role, teacherId: +teacherId, withoutTeacher })
    }

    @Auth()
    @HttpCode(200)
    @Get('current')
    async getUsers(@CurrentUser('id') id: number) {
        const user = await this.usersService.getFullUserInfo(id)

        const { password, session, otps, passwordReset, ...userToResponse } = user

        return userToResponse
    }

    @Auth()
    @HttpCode(200)
    @Get(':id')
    async getUserData(@CurrentUser() currentUser: User, @Param('id') id: string) {
        return this.usersService.getCurrentUser({ currentUser, searchedUserId: +id })
    }

    @Auth()
    @Admin()
    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
        return this.usersService.deleteOne(+id)
    }

    @Auth()
    @Admin()
    @Post(':teacherId/:studentId')
    @HttpCode(200)
    async addStudentToTeacher(
        @Param('teacherId') teacherId: string,
        @Param('studentId') studentId: string,
        @Res() res: Response
    ) {
        await this.usersService.addStudentToTeacher(+teacherId, +studentId)

        return res.json({ message: 'Ученик добавлен к учителю' })
    }

    @Auth()
    @Admin()
    @Delete('student/:id')
    async deleteStudentFromTeacher(@Param('id') id: string, @Res() res: Response) {
        await this.usersService.deleteStudentFromTeacher(+id)

        return res.json({ message: 'Ученик успешно удалён у учителя' })
    }

    @Auth()
    @HttpCode(200)
    @Patch('profile/:id')
    @UseInterceptors(FileInterceptor('avatar'))
    async changeTeacherInfo(
        @Body() dto: ChangeProfileDto,
        @Param('id') id: string,
        @CurrentUser() currentUser: User,
        @UploadedFile() avatar?: Express.Multer.File
    ) {
        return this.usersService.changeProfile({
            currentUser,
            changeUserId: +id,
            dto,
            avatar,
        })
    }

    @Auth()
    @HttpCode(200)
    @Patch('teacher/:id')
    @UseInterceptors(FileInterceptor('youtubeVideoPreviewUrl'))
    async changeProfile(
        @Body() dto: ChangeTeacherInfoDto,
        @Param('id') id: string,
        @UploadedFile() youtubeVideoPreviewUrl?: Express.Multer.File
    ) {
        return this.usersService.updateTeacherInfo({
            changeUserId: +id,
            dto,
            youtubeVideoPreviewUrl,
        })
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Post('email')
    async validateEmail(@Body() dto: CheckEmailDto) {
        await this.usersService.validateEmail(dto.email)
    }
}
