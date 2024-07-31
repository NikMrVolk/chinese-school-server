import { CreateMessageDto } from './dto/createMessage.dto'
import { Auth, CurrentUser } from 'src/utils/decorators'
import { User } from '@prisma/client'
import {
    Body,
    Controller,
    FileTypeValidator,
    Get,
    HttpCode,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import { ChatsService } from './chats.service'
import { WsChatGateway } from './wsChat.gateway'
import { Events } from './events/events'
import { Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'

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
    @Get(':chatId/messages')
    async getChatMessages(
        @Param('chatId') chatId: string,
        @Query('skip') skip: string,
        @Query('take') take: string,
        @Res({ passthrough: true }) res: Response
    ) {
        const response = await this.chatsService.getChatMessages(+chatId, +skip, +take)

        const { messages, totalCount } = response
        if (totalCount) {
            res.header('Access-Control-Expose-Headers', 'X-Total-Count')
            res.header('X-Total-Count', totalCount.toString())
        }

        return messages
    }

    @Auth()
    @HttpCode(200)
    @Post(':chatId/messages')
    @UseInterceptors(FileInterceptor('fileUrl'))
    async sendMessage(
        @Body() dto: CreateMessageDto,
        @CurrentUser() currentUser: User,
        @Param('chatId') chatId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024, message: 'Файл слишком большой' }),
                    new FileTypeValidator({
                        fileType: '.(jpg|jpeg|png|doc|docx|ppt|pptx|xls|xlsx|pdf)',
                    }),
                ],
                fileIsRequired: false,
            })
        )
        fileUrl?: Express.Multer.File
    ) {
        const message = await this.chatsService.createMessage(+chatId, currentUser.id, dto.text, fileUrl)
        this.wsChatGateway.server.to(chatId).emit(Events.NewMessage, message)
        return message
    }
}
