import { IsNumber } from 'class-validator'
import { CreateTransactionDto } from './create-transaction.dto'

export class UpdateTransactionDto extends CreateTransactionDto {
    @IsNumber()
    transactionId: number
}
