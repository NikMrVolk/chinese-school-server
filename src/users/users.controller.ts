import { Controller, Get, HttpCode } from '@nestjs/common'
import { UsersService } from './users.service'

import { Auth, CurrentUser } from 'src/utils/decorators'

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
    async getUserData() {}
}
