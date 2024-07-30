import { CreateMessageDto } from './dto/createMessage.dto'
import { Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'
import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common'
import { ChatsService } from './chats.service'
import { WsChatGateway } from './wsChat.gateway'
import { Events } from './events/events'
import { Response } from 'express'

@Controller('chats')
export class ChatsController {
    constructor(
        private readonly chatsService: ChatsService,
        private readonly wsChatGateway: WsChatGateway
    ) {}

    @Auth()
    @HttpCode(200)
    @Get(':teacherId')
    async getCurrentTeacherChats(
        @CurrentUser() currentUser: User,
        @Param('teacherId') teacherId: string,
        @Query('skip') skip: string,
        @Query('take') take: string,
        @Res({ passthrough: true }) res: Response
    ) {
        const response = await this.chatsService.getCurrentTeacherChats(+teacherId, currentUser, +skip, +take)

        const { chats, totalCount } = response
        if (totalCount) {
            res.header('Access-Control-Expose-Headers', 'X-Total-Count')
            res.header('X-Total-Count', totalCount.toString())
        }

        return chats
    }

    @Auth()
    @HttpCode(200)
    @Post(':chatId/messages')
    async sendMessage(
        @Body() dto: CreateMessageDto,
        @CurrentUser() currentUser: User,
        @Param('chatId') chatId: string
    ) {
        const message = await this.chatsService.createMessage(+chatId, currentUser.id, dto.text)
        this.wsChatGateway.server.to(chatId).emit(Events.NewMessage, message)
        return message
    }
}
