import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TariffDto } from './dto/tariff.dto'

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllStudentTariffs(studentId: number) {
        return this.prisma.purchasedTariff.findMany({
            where: {
                id: studentId,
            },
            select: {
                id: true,
                completedHours: true,
                paymentStatus: true,
                paymentLink: true,
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

    //todo fix deploy error
    // async createPurchase({ student, tariffId }: { student: Partial<Student>; tariffId: number }) {
    //     const selectedTariff = await this.prisma.tariff.findUnique({
    //         where: {
    //             id: tariffId,
    //         },
    //     })

    //     if (!selectedTariff) {
    //         throw new BadRequestException('Тариф не найден')
    //     }

    //     return this.prisma.purchasedTariff.create({
    //         data: {
    //             title: selectedTariff.title,
    //             price: selectedTariff.price,
    //             quantityHours: selectedTariff.quantityHours,
    //             benefits: selectedTariff.benefits,
    //             quantityWeeksActive: selectedTariff.quantityWeeksActive,
    //             isRescheduleLessons: selectedTariff.isRescheduleLessons,

    //             completedHours: 0,
    //             // todo генерация ссылки для оплаты и отправка её на почту
    //             paymentLink: 'paymentLink',
    //             paymentStatus: PaymentStatus.IN_PROCESS,
    //             Student: {
    //                 connect: {
    //                     id: student.id,
    //                 },
    //             },
    //         },
    //     })
    // }

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
}
