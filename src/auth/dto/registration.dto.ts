import { LanguageLevel, Role } from '@prisma/client'
import { IsEmail, IsEnum, IsString } from 'class-validator'
import { ProfileDto } from './profile.dto'

export class RegistrationDto extends ProfileDto {
    @IsEmail()
    email: string

    @IsEnum(Role)
    role: Role
}

export class RegistrationStudentDto extends RegistrationDto {
    @IsString()
    packageTitle: string

    @IsString()
    paymentLink: string

    @IsEnum(LanguageLevel)
    languageLevel: LanguageLevel
}
