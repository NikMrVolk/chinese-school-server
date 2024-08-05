import { IsNotEmpty, IsNumber } from 'class-validator'

export class MakePaymentDto {
    @IsNotEmpty({ message: 'Укажите id тарифа' })
    @IsNumber({}, { message: 'Неверный формат id тарифа' })
    tariffId: number

    @IsNotEmpty({ message: 'Укажите id пользователя' })
    @IsNumber({}, { message: 'Неверный формат id пользователя' })
    userId: number
}
