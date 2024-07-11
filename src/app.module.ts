import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TariffsModule } from './tariffs/tariffs.module'

@Module({
    imports: [ConfigModule.forRoot(), AuthModule, UsersModule, TariffsModule],
})
export class AppModule {}
