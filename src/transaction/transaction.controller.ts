import { Body, Controller, Post } from '@nestjs/common'

import { MakePaymentDto } from './dto/make-payment.dto'
import { TransactionService } from './transaction.service'

@Controller('transaction')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    @Post('make-payment')
    makePayment(@Body() dto: MakePaymentDto) {
        return this.transactionService.makePayment(dto)
    }
}
