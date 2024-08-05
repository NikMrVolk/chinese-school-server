import { Injectable } from '@nestjs/common'
import { PaymentStatusDto } from 'src/lib/yookassa/types/yookassa.types'
import { MailsService } from 'src/mails/mails.service'
import { PrismaService } from 'src/prisma.service'
import { generateRandomPassword, hashValue } from 'src/utils/helpers'

@Injectable()
export class WebhookService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailsService: MailsService
    ) {}

    async yookassa(dto: PaymentStatusDto) {
        const { object } = dto

        const { Student, ...purchasedTariff } = await this.prisma.purchasedTariff.findUnique({
            where: {
                paymentId: object.id,
            },
            include: {
                Student: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!purchasedTariff) {
            console.error('Транзакция не найдена')
            return
        }

        if (dto.event === 'payment.succeeded') {
            const expiredIn = new Date()
            expiredIn.setDate(purchasedTariff.quantityWeeksActive * 7)

            await this.prisma.purchasedTariff.update({
                where: {
                    paymentId: object.id,
                },
                data: {
                    paymentStatus: object.status,
                    expiredIn: expiredIn.toISOString(),
                },
            })

            if (!Student.user.password) {
                const password = generateRandomPassword(12, 15)

                await this.prisma.user.update({
                    where: {
                        id: Student.user.id,
                    },
                    data: {
                        password: await hashValue(password),
                    },
                })

                this.mailsService.sendRegistrationMail(Student.user.email, password)

                return
            }

            this.mailsService.sendSuccessBoughtMessage(Student.user.email, purchasedTariff.title)
        }
    }
}
