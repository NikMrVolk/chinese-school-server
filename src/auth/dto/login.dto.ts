import { IsBoolean, IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

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

    @IsBoolean({ message: `Неверный формат поля "Запомнить меня"` })
    rememberMe: boolean
}

export class LoginWithOtpDto extends LoginDto {
    @IsString({ message: 'Неверный формат кода' })
    @IsNotEmpty({ message: 'Код не может быть пустым' })
    otp: string
}
