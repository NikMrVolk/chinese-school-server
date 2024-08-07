import { IsDateString } from 'class-validator'

export class CreateLessonDto {
    @IsDateString({}, { each: true, message: 'Проверьте дату и время занятия' })
    startDate: string
}
