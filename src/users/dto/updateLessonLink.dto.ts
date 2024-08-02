import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateLessonLinkDto {
    @IsString({ message: 'Проверьте введённую ссылку' })
    @IsNotEmpty({ message: 'Ссылка не может быть пустой' })
    readonly link: string
}
