import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseArrayPipe,
    Patch,
    Post,
    Query,
    Res,
} from '@nestjs/common'
import { TariffsService } from './tariffs.service'
import { Entity } from 'src/utils/types'
import { PaymentStatus, Tariff, User } from '@prisma/client'
import { EntityService } from '../utils/services/entity.service'
import { Admin, Auth, CurrentUser } from 'src/utils/decorators'
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto'
import { Response } from 'express'
import { TransactionService } from 'src/transaction/transaction.service'

@Auth()
@Controller('tariffs')
export class TariffsController {
    constructor(
        private readonly tariffsService: TariffsService,
        private readonly entityService: EntityService,
        private readonly transactionService: TransactionService
    ) {}

    @HttpCode(200)
    @Get()
    async getAllTariffs() {
        return this.tariffsService.getAll()
    }

    @HttpCode(200)
    @Get(':id')
    async getOne(
        @Param('id') id: string,
        @Query('paymentStatus', new ParseArrayPipe({ separator: ',' }))
        paymentStatus: PaymentStatus[]
    ) {
        return this.tariffsService.getAllStudentTariffs(+id, paymentStatus)
    }

    @Admin()
    @HttpCode(200)
    @Post()
    async create(@Body() dto: CreateTariffDto) {
        const tariff = await this.tariffsService.create(dto)

        return tariff
    }

    @Admin()
    @HttpCode(200)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateTariffDto) {
        const tariff = await this.entityService.getById<Tariff>(Entity.TARIFF, +id)

        if (!tariff) throw new BadRequestException('Тариф не найден')

        return this.tariffsService.update(+id, dto)
    }

    @Admin()
    @HttpCode(200)
    @Delete(':id')
    async delete(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
        const isLast = await this.tariffsService.isLastActive()

        if (isLast) return res.json({ message: 'Нельзя удалить последний тариф' })

        return await this.tariffsService.delete(+id)
    }

    @Auth()
    @HttpCode(200)
    @Post(':id/buy')
    async buy(@Param('tariffId') tariffId: string, @CurrentUser() user: User) {
        return this.transactionService.makePayment({
            userId: user.id,
            tariffId: +tariffId,
        })
    }

    @Auth()
    @Admin()
    @HttpCode(200)
    @Post(':tariffId/:studentId/without-buy')
    async createPurchasedTariffWithoutBuy(@Param('tariffId') tariffId: string, @Param('studentId') studentId: string) {
        return this.tariffsService.createPurchasedTariffWithoutBuy(+tariffId, +studentId)
    }
}
