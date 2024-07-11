import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaService } from 'src/prisma.service'
import { UserService } from './user.service'
import { UserController } from './user.controller'

@Module({
    controllers: [UserController],
    providers: [PrismaService, UserService],
    imports: [ConfigModule],
    exports: [UserService],
})
export class UserModule {}
