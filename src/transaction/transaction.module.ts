import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { YookassaService } from 'src/lib/yookassa/yookassa.service'
import { PrismaService } from 'src/prisma.service'

import { TransactionController } from './transaction.controller'
import { TransactionService } from './transaction.service'
import { WebhookController } from './webhook/webhook.controller'
import { WebhookService } from './webhook/webhook.service'
import { MailsModule } from 'src/mails/mails.module'

@Module({
    imports: [HttpModule, ConfigModule, MailsModule],
    controllers: [TransactionController, WebhookController],
    providers: [PrismaService, YookassaService, TransactionService, WebhookService],
    exports: [TransactionService],
})
export class TransactionModule {}
