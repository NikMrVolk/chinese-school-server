import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TariffsModule } from './tariffs/tariffs.module'
import { LessonsModule } from './lessons/lessons.module'
import { MailsModule } from './mails/mails.module'
import { FilesModule } from './files/files.module'
import { ServeStaticModule } from '@nestjs/serve-static'
import * as path from 'path'

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: path.resolve(__dirname, '..', 'static'),
        }),
        ConfigModule.forRoot(),
        LessonsModule,
        AuthModule,
        UsersModule,
        TariffsModule,
        MailsModule,
        FilesModule,
    ],
})
export class AppModule {}
