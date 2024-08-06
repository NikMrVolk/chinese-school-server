import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TariffDto } from './dto/tariff.dto'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PaymentStatus } from '@prisma/client'

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllStudentTariffs(studentId: number) {
        return this.prisma.purchasedTariff.findMany({
            where: {
                studentId: studentId,
            },
            select: {
                id: true,
                title: true,
                price: true,
                quantityHours: true,
                benefits: true,
                quantityWeeksActive: true,
                isRescheduleLessons: true,
                isPopular: true,
                completedHours: true,
                paymentStatus: true,
                expiredIn: true,
                tariffId: true,
            },
        })
    }

    async getAll() {
        return this.prisma.tariff.findMany({
            select: this.generateTariffSelectObject(),
        })
    }

    async create(dto: TariffDto) {
        await this.isOtherPopular(dto)
        return this.prisma.tariff.create({
            data: {
                title: dto.title,
                price: dto.price,
                quantityHours: dto.quantityHours,
                benefits: dto.benefits,
                quantityWeeksActive: dto.quantityWeeksActive,
                isRescheduleLessons: dto.isRescheduleLessons,
                isPopular: dto.isPopular,
            },
            select: this.generateTariffSelectObject(),
        })
    }

    async isTariffExist(tariffTitle: string) {
        const tariff = await this.prisma.tariff.findFirst({
            where: {
                title: tariffTitle,
            },
        })

        if (!tariff) {
            throw new BadRequestException('Тариф с указанным названием не найден')
        }

        return tariff
    }

    async update(id: number, dto: TariffDto) {
        await this.isOtherPopular(dto)

        return this.prisma.tariff.update({
            where: {
                id,
            },
            data: {
                title: dto.title,
                price: dto.price,
                quantityHours: dto.quantityHours,
                benefits: dto.benefits,
                quantityWeeksActive: dto.quantityWeeksActive,
                isRescheduleLessons: dto.isRescheduleLessons,
                isPopular: dto.isPopular,
            },
            select: this.generateTariffSelectObject(),
        })
    }

    async isOtherPopular(dto: TariffDto) {
        if (dto.isPopular) {
            const allTariffs = await this.getAll()

            const popularTariff = allTariffs.find(tariff => tariff.isPopular)

            if (popularTariff) {
                await this.update(popularTariff.id, {
                    ...popularTariff,
                    isPopular: false,
                })

                return true
            }
        }

        return false
    }

    async delete(id: number) {
        return this.prisma.tariff.delete({
            where: {
                id,
            },

            select: this.generateTariffSelectObject(),
        })
    }

    async isLastActive() {
        const allActiveTariffs = await this.getAll()

        return allActiveTariffs.length === 1 ? true : false
    }

    generateTariffSelectObject() {
        return {
            id: true,
            title: true,
            price: true,
            quantityHours: true,
            benefits: true,
            quantityWeeksActive: true,
            isRescheduleLessons: true,
            isPopular: true,
        }
    }
    с

    @Cron(CronExpression.EVERY_30_MINUTES)
    async deleteNotBoughtTariffs() {
        const hourAgo = new Date()
        hourAgo.setHours(hourAgo.getHours() - 1)

        await this.prisma.purchasedTariff.deleteMany({
            where: {
                createdAt: {
                    lt: hourAgo,
                },
                paymentStatus: {
                    not: PaymentStatus.succeeded,
                },
            },
        })
    }
}
