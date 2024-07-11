import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString, Min, MinLength } from 'class-validator'

export class tariffDto {
    @MinLength(2, { message: 'название должно быть больше 2х символов' })
    @IsString({ message: 'Введите название' })
    title: string

    @MinLength(2, { message: 'Цена должна быть больше 2х символов' })
    @IsNumber({}, { message: 'Неверный формат цены' })
    @Min(2, { message: 'Цена в тарифе должно быть больше 9 рублей' })
    price: number

    @MinLength(1, { message: 'Укажите количество часов в тарифе' })
    @IsNotEmpty({ message: 'Укажите количество часов в тарифе' })
    @IsNumber({}, { message: 'Неверный формат количества часов в тарифе' })
    @Min(1, { message: 'Количество часов в тарифе должно быть больше 0' })
    quantityHours: number

    @IsArray({ message: 'Неверный формат возможностей тарифа' })
    @ArrayMinSize(1, { message: 'Должна быть хотя бы одна возможность тарифа' })
    @IsString({ each: true, message: 'Неверный формат возможностей тарифа' })
    benefits: string[]

    @MinLength(1, { message: 'Укажите количество недель в тарифе' })
    @IsString({ message: 'Неверный формат количества недель в тарифе' })
    @Min(1, { message: 'Количество недель в тарифе должно быть больше 0' })
    quantityWeeksActive: number

    @IsNotEmpty({ message: 'Неверный формат возможности переноса занятий' })
    @IsBoolean({ message: 'Неверный формат возможности переноса занятий' })
    isRescheduleLessons: boolean

    @IsNotEmpty({ message: 'Неверный формат популярности тарифа' })
    @IsBoolean({ message: 'Неверный формат популярности тарифа' })
    isPopular: boolean

    @IsNotEmpty({ message: 'Неверный формат статуса тарифа для покупки' })
    @IsBoolean({ message: 'Неверный формат статуса тарифа для покупки' })
    isDeleted: boolean
}
