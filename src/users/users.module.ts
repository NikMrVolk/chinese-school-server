import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaService } from 'src/prisma.service'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'

@Module({
    controllers: [UsersController],
    providers: [PrismaService, UsersService],
    imports: [ConfigModule],
    exports: [UsersService],
})
export class UsersModule {}
