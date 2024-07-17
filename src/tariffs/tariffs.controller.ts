import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common'
import { TariffsService } from './tariffs.service'
import { Entity } from 'src/utils/types'
import { Tariff } from '@prisma/client'
import { EntityService } from '../utils/services/entity.service'
import { Admin, Auth } from 'src/utils/decorators'
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto'
import { Response } from 'express'

@Auth()
@Controller('tariffs')
export class TariffsController {
    constructor(
        private readonly tariffsService: TariffsService,
        private readonly entityService: EntityService
    ) {}

    @HttpCode(200)
    @Get()
    async getActiveTariffs() {
        return this.tariffsService.getAllActive()
    }

    @HttpCode(200)
    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.tariffsService.getAllStudentTariffs(+id)
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
        const isLast = await this.tariffsService.isLastActiveAndBlockDelete()

        if (isLast) return res.json({ message: 'Нельзя удалить последний тариф' })

        return await this.tariffsService.delete(+id)
    }
}
