import { Role } from '@prisma/client'
import { IsEmail, IsEnum } from 'class-validator'
import { ProfileDto } from './profile.dto'

export class RegistrationDto extends ProfileDto {
    @IsEmail()
    email: string

    @IsEnum(Role)
    role: Role
}
