import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaService } from 'src/prisma.service'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { JwtService } from '@nestjs/jwt'
import { MailsModule } from 'src/mails/mails.module'
import { FilesModule } from 'src/files/files.module'
import { ChatsModule } from 'src/chats/chats.module'
import { StudentsController } from './students.controller'
import { StudentsService } from './students.service'

@Module({
    controllers: [UsersController, StudentsController],
    providers: [PrismaService, UsersService, JwtService, StudentsService],
    imports: [ConfigModule, MailsModule, FilesModule, ChatsModule],
    exports: [UsersService],
})
export class UsersModule {}
