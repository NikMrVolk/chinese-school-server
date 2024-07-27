import { IsString, MinLength } from 'class-validator'

export class ChangeTeacherInfoDto {
    @MinLength(2, { message: 'Id видео должно быть больше 2х символов' })
    @IsString({ message: 'Неверный формат id видео преподавателя' })
    youtubeVideoId: string

    @IsString({ message: 'Неверный формат опыта преподаватял' })
    experience: string

    @MinLength(10, { message: 'Описание преподавателя должно быть больше 9ти символов' })
    @IsString({ message: 'Неверный формат описания преподавателя' })
    description: string
}
