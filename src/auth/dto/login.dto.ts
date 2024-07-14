import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
    @IsEmail({}, { message: 'Неверный формат почты' })
    email: string

    @MinLength(7, {
        message: 'Пароль должен быть больше 6 символов',
    })
    @IsString({
        message: 'Неверный формат пароля',
    })
    password: string
}
