/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Controller, Get, HttpCode, Param } from '@nestjs/common'
import { UsersService } from './users.service'
import { Auth } from 'src/auth/decorators/auth.decorator'
import { CurrentUser } from 'src/auth/decorators/user.decorator'
import { Role, User } from '@prisma/client'

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Auth()
    @HttpCode(200)
    @Get(':id')
    async getUserData(@Param('id') userIdParam: string, @CurrentUser() currentUser: User) {}
}
