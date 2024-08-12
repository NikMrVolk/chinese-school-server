import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TariffDto } from './dto/tariff.dto'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PaymentStatus } from '@prisma/client'
import { UpdatePurchasedTariffDto } from './dto/updatePurchasedTariff.dto'

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllStudentTariffs(studentId: number, paymentStatus: PaymentStatus[]) {
        return this.prisma.purchasedTariff.findMany({
            where: {
                studentId: studentId,
                ...(paymentStatus.length > 0 && {
                    ...(paymentStatus.length === 1 && {
                        paymentStatus: paymentStatus[0],
                    }),
                    ...(paymentStatus.length > 1 && {
                        paymentStatus: { in: paymentStatus },
                    }),
                }),
            },
            select: {
                id: true,
                title: true,
                price: true,
                createdAt: true,
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

    @Cron(CronExpression.EVERY_3_HOURS)
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

    async createPurchasedTariffWithoutBuy(tariffId: number, studentId: number) {
        const tariff = await this.prisma.tariff.findUnique({
            where: {
                id: tariffId,
            },
        })

        if (!tariff) {
            throw new BadRequestException('Тариф не найден')
        }

        const expiredIn = new Date()
        expiredIn.setTime(expiredIn.getTime() + tariff.quantityWeeksActive * 7 * 24 * 60 * 60 * 1000)

        return this.prisma.purchasedTariff.create({
            data: {
                title: tariff.title,
                price: tariff.price,
                benefits: tariff.benefits,
                quantityHours: tariff.quantityHours,
                quantityWeeksActive: tariff.quantityWeeksActive,
                isRescheduleLessons: tariff.isRescheduleLessons,
                isPopular: false,
                paymentId: null,
                paymentStatus: PaymentStatus.succeeded,
                completedHours: 0,
                expiredIn,
                tariffId: tariff.id,
                Student: {
                    connect: {
                        id: studentId,
                    },
                },
            },
        })
    }

    async updatePurchasedTariff({
        purchasedTariffId,
        dto,
    }: {
        purchasedTariffId: number
        dto: UpdatePurchasedTariffDto
    }) {
        const purchasedTariff = await this.prisma.purchasedTariff.findUnique({
            where: {
                id: purchasedTariffId,
            },
        })

        if (!purchasedTariff) {
            throw new BadRequestException('Купленный тариф не найден')
        }

        if (purchasedTariff.paymentStatus !== PaymentStatus.succeeded) {
            throw new BadRequestException('Тариф, который вы пытаетесь изменить не оплачен')
        }

        const expiredDate = new Date(dto.expiredIn)
        expiredDate.setHours(0, 0, 0, 0)

        if (isNaN(expiredDate.getTime())) {
            throw new BadRequestException('Неверный формат введённой даты')
        }

        const currentDate = new Date()
        currentDate.setTime(currentDate.getTime() + purchasedTariff.quantityWeeksActive * 7 * 24 * 60 * 60 * 1000)
        if (expiredDate.getTime() > currentDate.getTime()) {
            throw new BadRequestException('Вы не можете поставить дату больше, чем позволяет время тарифа')
        }

        const completedHours = dto.completedHours

        if (completedHours < 0) {
            throw new BadRequestException('Количество оставшихся часов не может быть отрицательным')
        }

        if (completedHours > purchasedTariff.quantityHours) {
            throw new BadRequestException(
                'Количество оставшихся часов не может быть больше, чем количество часов в тарифе'
            )
        }
        const completedHoursToUpdate = purchasedTariff.quantityHours - completedHours

        return this.prisma.purchasedTariff.update({
            where: {
                id: purchasedTariffId,
            },
            data: {
                expiredIn: expiredDate.toISOString(),
                ...(!!completedHoursToUpdate && {
                    completedHours: completedHoursToUpdate,
                }),
            },
        })
    }
}
