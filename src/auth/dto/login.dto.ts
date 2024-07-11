import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
    @IsEmail()
    email: string

    @MinLength(6, {
        message: 'Пароль должен быть больше 5 символов',
    })
    @IsString()
    password: string
}
