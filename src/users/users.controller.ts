import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common'
import { UsersService } from './users.service'

import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { Role, User } from '@prisma/client'
import { Response } from 'express'
import { ChangeProfileDto } from './dto/ChangeProfile.dto'

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @HttpCode(200)
    @Get()
    async getAllUsers(@Query('role') role: Role, @Query('teacherId') teacherId: string) {
        return this.usersService.getUsers({ role, teacherId: +teacherId })
    }

    @Auth()
    @HttpCode(200)
    @Get('current')
    async getUsers(@CurrentUser('id') id: number) {
        return this.usersService.getFullUserInfo(id)
    }

    @Auth()
    @HttpCode(200)
    @Get(':id')
    async getUserData(@CurrentUser() currentUser: User, @Param('id') id: string) {
        return this.usersService.getCurrentUser({ currentUser, searchedUserId: +id })
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

        return res.json({ message: 'Студент добавлен к учителю' })
    }

    @Auth()
    @HttpCode(200)
    @Patch('profile/:id')
    async changeProfile(@Body() dto: ChangeProfileDto, @Param('id') id: string, @CurrentUser() currentUser: User) {
        return this.usersService.changeProfile({
            changeUserId: +id,
            currentUser,
            dto,
        })
    }
}
