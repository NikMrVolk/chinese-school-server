import { BadRequestException, Injectable } from '@nestjs/common'
import { Tariff, User } from '@prisma/client'
import { YookassaService } from 'src/lib/yookassa/yookassa.service'

import { PrismaService } from 'src/prisma.service'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { MakePaymentDto } from './dto/make-payment.dto'
import { YookassaPaymentResponse } from './response/payment-response'

@Injectable()
export class TransactionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly yookassa: YookassaService
    ) {}

    async makePayment({ tariffId, userId }: MakePaymentDto): Promise<YookassaPaymentResponse> {
        const tariff = await this.prisma.tariff.findUnique({
            where: {
                id: tariffId,
            },
        })

        if (!tariff) {
            throw new BadRequestException('Тариф не найден')
        }

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
        })

        if (!user) {
            throw new BadRequestException('Пользователь не найден')
        }

        const payment = await this.makeYooKassaPayment(user, tariff)

        return {
            confirmationToken: payment.confirmation.confirmation_token,
        }
    }

    async makeYooKassaPayment(user: User, tariff: Tariff) {
        const { title, price } = tariff

        try {
            const paymentResponse = await this.yookassa.createPayment({
                currency: 'RUB',
                customerEmail: user.email,
                items: [
                    {
                        description: `Оплата тарифа ${title} | ${user.email}`,
                        quantity: '1.00',
                        amount: {
                            value: price.toString(),
                            currency: 'RUB',
                        },
                        vat_code: '1',
                    },
                ],
                total: price.toString(),
            })

            if (paymentResponse) {
                await this.create({
                    payment: paymentResponse,
                    userId: user.id,
                    tariff: tariff,
                })
            }

            return paymentResponse
        } catch (error) {
            console.log('make payment error', error)
            throw new BadRequestException('Ошибка при создании платежа')
        }
    }

    async create({ userId, tariff, payment }: CreateTransactionDto) {
        const { student } = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                student: true,
            },
        })

        if (!student) {
            throw new BadRequestException('Студент не найден')
        }

        return this.prisma.purchasedTariff.create({
            data: {
                title: tariff.title,
                price: tariff.price,
                benefits: tariff.benefits,
                quantityHours: tariff.quantityHours,
                quantityWeeksActive: tariff.quantityWeeksActive,
                isRescheduleLessons: tariff.isRescheduleLessons,
                isPopular: tariff.isPopular,
                paymentId: payment.id,
                paymentStatus: payment.status,
                completedHours: 0,
                expiredIn: null,
                Student: {
                    connect: {
                        id: student.id,
                    },
                },
            },
        })
    }
}
