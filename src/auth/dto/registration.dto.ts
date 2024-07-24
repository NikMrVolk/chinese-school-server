import { LanguageLevel } from '@prisma/client'
import { IsEmail, IsEnum, IsNumber, IsString, MinLength } from 'class-validator'
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

    @IsNumber({}, { message: 'Неверный формат выбранного тарифа' })
    tariffId: number

    @IsEnum(LanguageLevel, { message: 'Неверный формат уровня владения языком' })
    languageLevel: LanguageLevel
}

export class RegistrationTeacherDto extends RegistrationDto {
    @MinLength(2, { message: 'Id видео должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат id видео преподавателя' })
    youtubeVideoId: string

    @MinLength(2, { message: 'Название изображения должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат названия изображения' })
    youtubeVideoPreviewUrl: string

    @IsNumber({}, { message: 'Неверный формат опыта преподаватял' })
    experience: number

    @MinLength(10, { message: 'Описание преподавателя должно быть больше 9ти символов' })
    @IsString({ message: 'Неверный формат описания преподавателя' })
    description: string
}
