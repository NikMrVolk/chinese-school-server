import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from 'src/auth/configs/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { UsersModule } from 'src/users/users.module'
import { TariffsModule } from 'src/tariffs/tariffs.module'

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PrismaService],
    imports: [
        ConfigModule,
        UsersModule,
        TariffsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getJwtConfig,
        }),
    ],
    exports: [],
})
export class AuthModule {}
