import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class UpdatePackageDto {
    @IsString({ message: 'Проверьте название пакета' })
    @IsNotEmpty({ message: 'Название пакета не может быть пустой' })
    @MaxLength(100, { message: 'Название пакета не может быть больше 100 символов' })
    readonly packageTitle: string
}
