import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TariffDto } from './dto/tariff.dto'

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: TariffDto) {
        return this.prisma.tariff.create({
            data: dto,
            select: {
                id: true,
                title: true,
                price: true,
                quantityHours: true,
                benefits: true,
                quantityWeeksActive: true,
                isRescheduleLessons: true,
                isPopular: true,
                isDeleted: true,
            },
        })
    }

    async update(id: number, dto: TariffDto) {
        return this.prisma.tariff.update({
            where: {
                id,
            },
            data: dto,
            select: {
                id: true,
                title: true,
                price: true,
                quantityHours: true,
                benefits: true,
                quantityWeeksActive: true,
                isRescheduleLessons: true,
                isPopular: true,
                isDeleted: true,
            },
        })
    }
}
