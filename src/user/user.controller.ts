import { Controller, Get, HttpCode, Param } from '@nestjs/common'

@Controller('users')
export class UserController {
    constructor() {}

    @HttpCode(200)
    @Get(':id')
    async findOne(@Param() params: any): Promise<string> {
        console.log(params.id)
        return `This action returns a #${params.id} cat`
    }
}
