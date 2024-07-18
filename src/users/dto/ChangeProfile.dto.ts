import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class ChangeProfileDto {
    @IsEmail({}, { message: 'Неверный формат почты' })
    email: string

    @MinLength(2, { message: 'Имя должно быть больше 2х символов' })
    @IsString({ message: 'Введите имя' })
    name: string

    @MinLength(2, { message: 'Фамилия должна быть больше 2х символов' })
    @IsString({ message: 'Введите фамилию' })
    surname: string

    @MinLength(2, { message: 'Отчество должно быть больше 2х символов' })
    @IsString({ message: 'Введите отчество' })
    patronymic: string

    @IsNotEmpty({ message: 'Введите телефон' })
    @IsString({ message: 'Введите телефон' })
    phone: string

    @IsNotEmpty({ message: 'Введите телеграм' })
    @IsString({ message: 'Введите телеграм' })
    telegram: string
}
