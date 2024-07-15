import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { UsersService } from './users.service'

import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

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
    async addStudentToTeacher(@Param('teacherId') teacherId: string, @Param('studentId') studentId: string) {
        return this.usersService.addStudentToTeacher(+teacherId, +studentId)
    }
}
