import { LanguageLevel } from '@prisma/client'
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator'
import { ProfileDto } from './profile.dto'

export class RegistrationDto extends ProfileDto {
    @IsEmail()
    email: string
}

export class RegistrationStudentDto extends RegistrationDto {
    @MinLength(2, { message: 'Название пакета должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат названия пакета' })
    packageTitle: string

    @MinLength(2, { message: 'Cсылка должна быть больше 2х символов' })
    @IsString({ message: 'Неверный формат ссылки для оплаты' })
    paymentLink: string

    @MinLength(2, { message: 'Название тарифа должно быть больше 2х символов' })
    @IsString({ message: 'Проверьте название тарифа' })
    tariffTitle: string

    @IsEnum(LanguageLevel, { message: 'Неверный формат уровня владения языком' })
    languageLevel: LanguageLevel
}

export class RegistrationTeacherDto extends RegistrationDto {
    @MinLength(2, { message: 'Id видео должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат id видео преподавателя' })
    youtubeVideoId: string

    @IsString({ message: 'Неверный формат опыта преподаватял' })
    experience: string

    @MinLength(10, { message: 'Описание преподавателя должно быть больше 9ти символов' })
    @IsString({ message: 'Неверный формат описания преподавателя' })
    description: string
}
