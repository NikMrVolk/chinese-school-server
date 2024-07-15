import { IsDateString, IsNumber } from 'class-validator'

export class LessonDto {
    @IsNumber({}, { message: 'Неверный формат ID студента' })
    studentId: number

    @IsNumber({}, { message: 'Неверный формат ID учителя' })
    teacherId: number

    @IsDateString({}, { each: true, message: 'Неверный формат даты занятия' })
    startDate: Date
}
