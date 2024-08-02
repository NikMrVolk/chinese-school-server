import { LanguageLevel } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateLanguageLevelDto {
    @IsEnum(LanguageLevel, { message: 'Проверьте введённый уровень языка' })
    readonly languageLevel: LanguageLevel
}
