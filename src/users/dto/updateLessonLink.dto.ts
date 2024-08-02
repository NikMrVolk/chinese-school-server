import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateLessonLinkDto {
    @IsString({ message: 'Проверьте введэнную ссылку' })
    @IsNotEmpty({ message: 'Ссылка не может быть пустой' })
    readonly link: string
}
