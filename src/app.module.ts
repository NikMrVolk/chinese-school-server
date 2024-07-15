import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TariffsModule } from './tariffs/tariffs.module'
import { LessonsModule } from './lessons/lessons.module'

@Module({
    imports: [ConfigModule.forRoot(), AuthModule, UsersModule, TariffsModule, LessonsModule],
})
export class AppModule {}
