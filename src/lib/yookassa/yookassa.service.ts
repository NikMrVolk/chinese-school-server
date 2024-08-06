import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import { YookassaPaymentDto } from './dto/yookassa.dto'
import { ICreatePaymentRequest, LocaleEnum, ObjectPayment } from './types/yookassa.types'
import { DEFAULT_TIMEOUT, DEFAULT_URL } from './yookassa.constants'

@Injectable()
export class YookassaService {
    constructor(private readonly httpService: HttpService) {}

    createPayment({ currency, customerEmail, items, total }: YookassaPaymentDto) {
        const payload: ICreatePaymentRequest = {
            amount: {
                currency,
                value: total,
            },
            description: items[0].description,
            receipt: {
                customer: {
                    email: customerEmail,
                },
                items,
            },
            capture: true,
            confirmation: {
                type: 'embedded',
                locale: LocaleEnum.ru_RU,
            },
        }

        return this.request<ObjectPayment | null>('POST', 'payments', payload)
    }

    createPaymentBySavedCard({
        currency,
        customerEmail,
        items,
        total,
        paymentId,
    }: YookassaPaymentDto & { paymentId: string }) {
        const payload: ICreatePaymentRequest = {
            amount: {
                currency,
                value: total,
            },
            description: `Оплата тарифа ${items[0].description} | ${customerEmail}`,
            receipt: {
                customer: {
                    email: customerEmail,
                },
                items,
            },
            capture: true,
            payment_method_id: paymentId,
        }

        return this.request<ObjectPayment>('POST', 'payments', payload)
    }

    // capturePayment(id: string, amount: string) {
    //     return this.request('POST', `payments/${id}/capture`, { amount })
    // }

    // getPayment(id: string) {
    //     return this.request('GET', `payments/${id}`)
    // }

    async request<T>(
        method: string,
        path: string,
        payload: any = '',
        idempotenceKey: string | null = null
    ): Promise<T> {
        /**
         * Generate idempotence key if not present
         * @see https://yookassa.ru/developers/using-api/basics#idempotence
         */
        if (!idempotenceKey) idempotenceKey = uuid()

        try {
            const { data } = await this.httpService.axiosRef.request({
                method,
                url: DEFAULT_URL + path,
                timeout: DEFAULT_TIMEOUT,
                data: payload,
                auth: {
                    username: process.env.SHOP_ID,
                    password: process.env.SHOP_SECRET,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotence-Key': idempotenceKey,
                },
            })

            return data
        } catch (error) {
            if (error.response) {
                /*
                 * The request was made and the server responded with a
                 * status code that falls out of the range of 2xx
                 */
                console.log(error.response.data)
                console.log(error.response.status)
                console.log(error.response.headers)
            } else if (error.request) {
                /*
                 * The request was made but no response was received, `error.request`
                 * is an instance of XMLHttpRequest in the browser and an instance
                 * of http.ClientRequest in Node.js
                 */
                console.log(error.request)
            } else {
                // Something happened in setting up the request and triggered an Error
                console.log('Error message', error.message)
            }
            console.log(error)
        }
    }
}
