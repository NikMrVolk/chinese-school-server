import { Module } from '@nestjs/common'
import { LessonsService } from './lessons.service'
import { LessonsController } from './lessons.controller'
import { PrismaService } from 'src/prisma.service'
import { UsersService } from 'src/users/users.service'
import { JwtService } from '@nestjs/jwt'

@Module({
    controllers: [LessonsController],
    providers: [LessonsService, PrismaService, UsersService, JwtService],
})
export class LessonsModule {}
