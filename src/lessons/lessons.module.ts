import { Module } from '@nestjs/common'
import { LessonsService } from './lessons.service'
import { LessonsController } from './lessons.controller'
import { PrismaService } from 'src/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { MailsModule } from 'src/mails/mails.module'
import { UsersModule } from 'src/users/users.module'

@Module({
    controllers: [LessonsController],
    providers: [LessonsService, PrismaService, JwtService],
    imports: [MailsModule, UsersModule, UsersModule],
})
export class LessonsModule {}
