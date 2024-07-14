import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TariffDto } from './dto/tariff.dto'
import { PaymentStatus, Student } from '@prisma/client'

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllActive() {
        return this.prisma.tariff.findMany({
            where: {
                isDeleted: false,
            },
            select: this.generateTariffSelectObject(),
        })
    }

    async create(dto: TariffDto) {
        await this.isOtherPopular(dto)

        return this.prisma.tariff.create({
            data: dto,
            select: this.generateTariffSelectObject(),
        })
    }

    async createPurchase({ student, tariffId }: { student: Partial<Student>; tariffId: number }) {
        return this.prisma.purchasedTariff.create({
            data: {
                completedHours: 0,
                // todo генерация ссылки для оплаты и отправка её на почту
                paymentLink: 'paymentLink',
                paymentStatus: PaymentStatus.IN_PROCESS,
                Student: {
                    connect: {
                        id: student.id,
                    },
                },
                Tariff: {
                    connect: {
                        id: tariffId,
                    },
                },
            },
        })
    }

    async isTariffActiveAndExist(tariffId: number) {
        const tariff = await this.prisma.tariff.findUnique({
            where: {
                id: tariffId,
            },
        })

        if (!tariff || tariff.isDeleted) {
            throw new BadRequestException('Тариф не найден')
        }
    }

    async update(id: number, dto: TariffDto) {
        await this.isOtherPopular(dto)

        return this.prisma.tariff.update({
            where: {
                id,
            },
            data: dto,
            select: this.generateTariffSelectObject(),
        })
    }

    async isOtherPopular(dto: TariffDto) {
        if (dto.isPopular) {
            const allTariffs = await this.getAllActive()

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
        return this.prisma.tariff.update({
            where: {
                id,
            },
            data: {
                isDeleted: true,
                isPopular: false,
            },
            select: this.generateTariffSelectObject(),
        })
    }

    async isLastActiveAndBlockDelete() {
        const allActiveTariffs = await this.getAllActive()

        if (allActiveTariffs.length === 1) {
            throw new Error('в приложении всегда должен быть хотя бы один тариф')
        }
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
            isDeleted: true,
        }
    }
}
