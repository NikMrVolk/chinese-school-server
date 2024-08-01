import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { FilesService } from 'src/files/files.service'
import { Role, User } from '@prisma/client'
import { Cron } from '@nestjs/schedule'

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
                    isDayChange: true,
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

    async createMessage(
        chatId: number,
        senderId: number,
        text?: string,
        file?: Express.Multer.File,
        lastMessageTimestamp?: string
    ) {
        let fileUrl: string
        let fileOriginalName: string
        if (file) {
            fileOriginalName = file.originalname
            fileUrl = await this.filesService.createFile(file)
        }

        let isDayChange = true
        if (lastMessageTimestamp) {
            isDayChange = new Date(lastMessageTimestamp).getDay() === new Date().getDay() ? false : true
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
                        isDayChange,
                        ...(text && { text }),
                        ...(fileUrl && { fileUrl: fileUrl, text: fileOriginalName }),
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

    async deleteChatWithMessages(chatId: number) {
        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId,
            },
            select: {
                message: true,
            },
        })

        const filesUrl = chat.message.filter(message => message.fileUrl).map(message => message.fileUrl)

        await Promise.all(filesUrl.map(fileUrl => this.filesService.deleteFile(fileUrl)))

        await this.prisma.chat.delete({
            where: {
                id: chatId,
            },
        })
    }

    @Cron('0 0 0 * * 7')
    private async deleteMessagesAndFilesAfterSixMonths() {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const messages = await this.prisma.message.findMany({
            where: {
                createdAt: {
                    lt: sixMonthsAgo,
                },
            },
            select: {
                fileUrl: true,
            },
        })

        const filesUrl = messages.filter(message => message.fileUrl).map(message => message.fileUrl)

        await Promise.all(filesUrl.map(fileUrl => this.filesService.deleteFile(fileUrl)))
        await this.prisma.message.deleteMany({
            where: {
                createdAt: {
                    lt: sixMonthsAgo,
                },
            },
        })
    }
}
