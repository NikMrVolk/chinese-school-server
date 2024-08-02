import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateNotesDto {
    @IsString({ message: 'Проверьте введённый текст' })
    @IsNotEmpty({ message: 'Текст не может быть пустым' })
    readonly text: string
}
