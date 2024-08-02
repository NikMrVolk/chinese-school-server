import { ForbiddenException, Injectable } from '@nestjs/common'
import { Role, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { UpdateLessonLinkDto } from './dto/updateLessonLink.dto'
import { UpdateNotesDto } from './dto/updateNotes.dto'

@Injectable()
export class StudentsService {
    constructor(private prisma: PrismaService) {}

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
        console.log(studentId)

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
}
