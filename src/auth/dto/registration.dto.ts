import { LanguageLevel, Role } from '@prisma/client'
import { IsEmail, IsEnum, IsNumber, IsString, MinLength } from 'class-validator'
import { ProfileDto } from './profile.dto'

export class RegistrationDto extends ProfileDto {
    @IsEmail()
    email: string

    @IsEnum(Role)
    role: Role
}

export class RegistrationStudentDto extends RegistrationDto {
    @MinLength(2, { message: 'Название пакета должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат названия пакета' })
    packageTitle: string

    @MinLength(2, { message: 'Cсылка должна быть больше 2х символов' })
    @IsString({ message: 'Неверный формат ссылки для оплаты' })
    paymentLink: string

    @IsNumber({}, { message: 'Неверный формат выбранного тарифа' })
    tariffId: number

    @IsEnum(LanguageLevel, { message: 'Неверный формат уровня владения языком' })
    languageLevel: LanguageLevel
}
