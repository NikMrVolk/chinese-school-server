import { IsDateString, IsNotEmpty, IsNumber } from 'class-validator'

export class UpdatePurchasedTariffDto {
    @IsNotEmpty({ message: 'Не указана дата окончания тарифа' })
    @IsDateString({}, { message: 'Неверный формат даты окончания тарифа' })
    expiredIn: string

    @IsNotEmpty({ message: 'Не указано количество оставшихся часов' })
    @IsNumber({}, { message: 'Неверный формат количества оставшихся часов' })
    completedHours: number
}
