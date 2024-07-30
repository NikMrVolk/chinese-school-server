import { Module } from '@nestjs/common'
import { ChatsService } from './chats.service'
import { PrismaService } from 'src/prisma.service'
import { FilesModule } from 'src/files/files.module'
import { ChatsController } from './chats.controller'
import { WsChatGateway } from './wsChat.gateway'

@Module({
    imports: [FilesModule],
    providers: [ChatsService, PrismaService, WsChatGateway],
    controllers: [ChatsController],
})
export class ChatsModule {}
