import { Module } from '@nestjs/common'
import { LessonsService } from './lessons.service'
import { LessonsController } from './lessons.controller'
import { PrismaService } from 'src/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { MailsModule } from 'src/mails/mails.module'
import { UsersModule } from 'src/users/users.module'
import { LessonsCheckService } from './lessonsCheck.service'
import { ZoomService } from './zoom/zoom.service'
import { HttpModule } from '@nestjs/axios'
import { WebhookService } from 'src/transaction/webhook/webhook.service'

@Module({
    imports: [MailsModule, UsersModule, UsersModule, HttpModule],
    controllers: [LessonsController],
    providers: [LessonsService, LessonsCheckService, PrismaService, JwtService, ZoomService, WebhookService],
})
export class LessonsModule {}
