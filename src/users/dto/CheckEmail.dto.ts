import { IsEmail } from 'class-validator'

export class CheckEmailDto {
    @IsEmail({}, { message: 'Неверный формат почты' })
    email: string
}
