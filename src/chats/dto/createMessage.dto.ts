import { IsNotEmpty, IsString } from 'class-validator'
import { IsOptionalNonNullable } from 'src/utils/decorators'

export class CreateMessageDto {
    @IsOptionalNonNullable()
    @IsString({ message: 'Некорректный текст сообщения' })
    @IsNotEmpty({ message: 'Текст сообщения не может быть пустым' })
    text: string

    @IsOptionalNonNullable()
    lastMessageTimestamp: string
}
