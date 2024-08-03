import { Module } from '@nestjs/common'
import { LessonsService } from './lessons.service'
import { LessonsController } from './lessons.controller'
import { PrismaService } from 'src/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { MailsModule } from 'src/mails/mails.module'
import { UsersModule } from 'src/users/users.module'
import { LessonsCheckService } from './lessonsCheck.service'

@Module({
    controllers: [LessonsController],
    providers: [LessonsService, LessonsCheckService, PrismaService, JwtService],
    imports: [MailsModule, UsersModule, UsersModule],
})
export class LessonsModule {}
