import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { FilesService } from 'src/files/files.service'
import { Role, User } from '@prisma/client'

@Injectable()
export class ChatsService {
    constructor(
        private prisma: PrismaService,
        private filesService: FilesService
    ) {}

    async getCurrentTeacherChats(teacherId: number, currentUser: User, skip?: number, take?: number) {
        if (currentUser.role === Role.STUDENT) {
            throw new ForbiddenException('Доступ запрещен')
        }

        const [chats, totalCount] = await Promise.all([
            this.prisma.chat.findMany({
                where: {
                    teacherId,
                },
                select: {
                    id: true,
                    lastMessageTimestamp: true,
                    Student: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    profile: {
                                        select: {
                                            name: true,
                                            surname: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    lastMessageTimestamp: 'desc',
                },
                ...(skip && { skip }),
                ...(take && { take }),
            }),
            ...(skip || take ? [this.prisma.chat.count({ where: { teacherId } })] : []),
        ])

        if (chats.length === 0) {
            return {
                teacherChats: [],
                totalCount,
            }
        }

        const response = chats.map(
            ({
                id: chatId,
                lastMessageTimestamp,
                Student: {
                    user: {
                        id,
                        profile: { name, surname },
                    },
                },
            }) => ({
                id: chatId,
                userId: id,
                lastMessageTimestamp,
                name,
                surname,
            })
        )

        return {
            chats: response,
            totalCount,
        }
    }

    async getChatMessages(chatId: number, skip: number, take: number) {
        const [messages, totalCount] = await Promise.all([
            this.prisma.message.findMany({
                where: {
                    chatId,
                },
                ...(take && { take }),
                ...(skip && { skip }),
                orderBy: {
                    timestamp: 'desc',
                },
                select: {
                    id: true,
                    text: true,
                    fileUrl: true,
                    timestamp: true,
                    senderId: true,
                },
            }),
            ...(skip || take ? [this.prisma.message.count({ where: { chatId } })] : []),
        ])

        if (messages.length === 0) {
            return {
                messages: [],
                totalCount,
            }
        }

        return {
            messages: messages.reverse(),
            totalCount,
        }
    }

    async createMessage(chatId: number, senderId: number, text?: string, file?: Express.Multer.File) {
        let fileName: string
        if (file) {
            fileName = await this.filesService.createFile(file)
        }

        const chat = await this.prisma.chat.update({
            where: {
                id: chatId,
            },
            data: {
                lastMessageTimestamp: new Date(),
                message: {
                    create: {
                        senderId,
                        ...(text && { text }),
                        ...(fileName && { fileUrl: fileName }),
                    },
                },
            },
            include: {
                message: {
                    take: -1,
                },
            },
        })

        if (!chat) {
            throw new BadRequestException('Ошибка отправки сообщения')
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { message, ...chatToResponse } = chat

        return message[message.length - 1]
    }
}
