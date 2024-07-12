import { BadRequestException, Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { tariffDto } from './dto/tariff.dto'
import { TariffsService } from './tariffs.service'
import { Entity } from 'src/utils/types'
import { Tariff } from '@prisma/client'
import { EntityService } from '../utils/services/entity.service'
import { Admin, Auth } from 'src/utils/decorators'

@Auth()
@Controller('tariffs')
export class TariffsController {
    constructor(
        private readonly tariffsService: TariffsService,
        private readonly entityService: EntityService
    ) {}

    @HttpCode(200)
    @Post()
    async create(@Body() dto: tariffDto) {
        const tariff = await this.tariffsService.create(dto)

        return tariff
    }

    @Admin()
    @HttpCode(200)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: tariffDto) {
        const tariff = await this.entityService.getById<Tariff>(Entity.TARIFF, +id)

        if (!tariff) throw new BadRequestException('Тариф не найден')

        return this.tariffsService.update(+id, dto)
    }
}
