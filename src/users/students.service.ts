import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { UpdateLessonLinkDto } from './dto/updateLessonLink.dto'
import { UpdateNotesDto } from './dto/updateNotes.dto'
import { UpdateLanguageLevelDto } from './dto/updateLanguageLevel.dto'
import { FilesService } from 'src/files/files.service'

@Injectable()
export class StudentsService {
    MAX_HOMEWORK_FILES_COUNT = 5

    constructor(
        private prisma: PrismaService,
        private filesService: FilesService
    ) {}

    async updateLessonLink(studentId: number, dto: UpdateLessonLinkDto) {
        return await this.prisma.student.update({
            where: {
                id: studentId,
            },
            data: {
                lessonLink: dto.link,
            },
        })
    }

    async updateNotes(studentId: number, dto: UpdateNotesDto) {
        return await this.prisma.note.update({
            where: {
                studentId,
            },
            data: {
                text: dto.text,
            },
        })
    }

    async isCurrentTeacherHaveThisStudent(currentUser: User, studentId: number): Promise<boolean> {
        if (currentUser.role === Role.ADMIN) {
            return true
        }

        const { teacher } = await this.prisma.user.findUnique({
            where: {
                id: currentUser.id,
            },
            select: {
                teacher: {
                    select: {
                        students: true,
                    },
                },
            },
        })

        if (!teacher) {
            throw new ForbiddenException('Ошибка доступа')
        }

        const studentsFromTeacher = teacher.students.find(student => student.id === studentId)

        if (!studentsFromTeacher) {
            throw new ForbiddenException('Ошибка доступа')
        }

        return true
    }

    async updateLanguageLevel(studentId: number, dto: UpdateLanguageLevelDto) {
        return await this.prisma.student.update({
            where: {
                id: studentId,
            },
            data: {
                languageLevel: dto.languageLevel,
            },
        })
    }

    async updateHomeWork(studentId: number, files: Array<Express.Multer.File>) {
        const homeworks = await this.prisma.homework.findMany({
            where: {
                studentId,
            },
        })

        if (homeworks.length === this.MAX_HOMEWORK_FILES_COUNT) {
            throw new BadRequestException('Максимальное количество домашних заданий - 5')
        }

        if (files.length + homeworks.length > this.MAX_HOMEWORK_FILES_COUNT) {
            files.length = this.MAX_HOMEWORK_FILES_COUNT - homeworks.length
        }

        const filesUrls = await Promise.all(files.map(file => this.filesService.createFile(file)))

        return await this.prisma.homework.createMany({
            data: filesUrls.map((fileUrl, id) => ({
                studentId,
                title: files[id].originalname,
                fileUrl,
            })),
        })
    }

    async deleteHomeWork(studentId: number, homeworkId: number) {
        const homework = await this.prisma.homework.findUnique({
            where: {
                id: homeworkId,
            },
        })

        if (!homework) {
            throw new BadRequestException('Домашнее задание не найдено')
        }

        await this.filesService.deleteFile(homework.fileUrl)

        return this.prisma.homework.delete({
            where: {
                id: homeworkId,
                studentId,
            },
        })
    }
}
