import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class FreeLessonInviteDto {
    @IsOptional()
    @IsString({ message: 'Проверьте почту' })
    email?: string

    @IsString({ message: 'Проверьте имя' })
    @IsNotEmpty({ message: 'проверьте имя' })
    name: string

    @IsString({ message: 'Проверьте почту' })
    @IsNotEmpty({ message: 'проверьте телефон' })
    phone: string
}
