import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString, Min, MinLength } from 'class-validator'

export class TariffDto {
    @IsNotEmpty({ message: 'Укажите название тарифа' })
    @MinLength(2, { message: 'название должно быть больше 2х символов' })
    @IsString({ message: 'Введите название' })
    title: string

    @IsNotEmpty({ message: 'Укажите цену тарифа' })
    @IsNumber({}, { message: 'Неверный формат цены' })
    @Min(10, { message: 'Цена в тарифе должно быть больше 9 рублей' })
    price: number

    @IsNotEmpty({ message: 'Укажите количество часов в тарифе' })
    @IsNumber({}, { message: 'Неверный формат количества часов в тарифе' })
    @Min(1, { message: 'Количество часов в тарифе должно быть больше 0' })
    quantityHours: number

    @IsArray({ message: 'Неверный формат возможностей тарифа' })
    @ArrayMinSize(1, { message: 'Должна быть хотя бы одна возможность тарифа' })
    @IsString({ each: true, message: 'Неверный формат возможностей тарифа' })
    benefits: string[]

    @IsNotEmpty({ message: 'Укажите количество недель действия тарифа' })
    @IsNumber({}, { message: 'Неверный формат количества недель в тарифе' })
    @Min(1, { message: 'Количество недель в тарифе должно быть больше 0' })
    quantityWeeksActive: number

    @IsNotEmpty({ message: 'Неверный формат возможности переноса занятий' })
    @IsBoolean({ message: 'Неверный формат возможности переноса занятий' })
    isRescheduleLessons: boolean

    @IsNotEmpty({ message: 'Неверный формат популярности тарифа' })
    @IsBoolean({ message: 'Неверный формат популярности тарифа' })
    isPopular: boolean
}

export class CreateTariffDto extends TariffDto {}

export class UpdateTariffDto extends TariffDto {}
