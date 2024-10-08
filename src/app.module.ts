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
import { ChatsModule } from './chats/chats.module'
import { ScheduleModule } from '@nestjs/schedule'
import { TransactionModule } from './transaction/transaction.module'

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: path.resolve(__dirname, '..', 'client'),
        }),
        ScheduleModule.forRoot(),
        ConfigModule.forRoot(),
        LessonsModule,
        AuthModule,
        UsersModule,
        TariffsModule,
        MailsModule,
        FilesModule,
        ChatsModule,
        TransactionModule,
    ],
})
export class AppModule {}
