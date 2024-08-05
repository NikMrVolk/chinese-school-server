import { Tariff } from '@prisma/client'
import { ObjectPayment } from 'src/lib/yookassa/types/yookassa.types'

export class CreateTransactionDto {
    tariff: Tariff
    userId: number
    payment: ObjectPayment
}
