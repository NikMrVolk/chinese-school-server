import { Controller, Get, HttpCode, Param } from '@nestjs/common'
import { UsersService } from './users.service'

import { Auth, CurrentUser } from 'src/utils/decorators'
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
}
