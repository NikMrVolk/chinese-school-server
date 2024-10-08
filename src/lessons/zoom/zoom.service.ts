import { HttpService } from '@nestjs/axios'

import { BadRequestException, Injectable } from '@nestjs/common'
import { GetMeetingQueryParams, GetPastMeetingDetailsResponse } from './zoom.types'
import { LessonStatus } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { EndedLessonWebhook } from '../webhook.types'
import { CreateLessonDto } from '../dto/lesson.dto'

@Injectable()
export class ZoomService {
    ZOOM_BASE_API_URL = 'https://api.zoom.us/v2/'
    ZOOM_BASE_AUTH_URL = 'https://zoom.us/oauth/token'
    DEFAULT_TIMEOUT = 120000
    DEFAULT_MEET_TYPE = 2
    DEFAULT_MEET_DURATION = 60
    DEFAULT_MEET_TIMEZONE = 'Europe/Moscow'

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService
    ) {}

    async getToken() {
        try {
            const url =
                this.ZOOM_BASE_AUTH_URL + '?grant_type=account_credentials&account_id=' + process.env.ZOOM_ACCOUNT_ID

            const {
                data: { access_token: accessToken },
            } = await this.httpService.axiosRef.request<{ access_token: string }>({
                method: 'POST',
                url,
                timeout: this.DEFAULT_TIMEOUT,
                auth: {
                    username: process.env.ZOOM_CLIENT_ID,
                    password: process.env.ZOOM_CLIENT_SECRET,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            return accessToken
        } catch (e) {
            console.log(e)
            throw new BadRequestException('Ошибка авторизации в zoom')
        }
    }

    async getMeetings(params: GetMeetingQueryParams) {
        const accessToken = await this.getToken()

        try {
            const data = await this.httpService.axiosRef.request({
                method: 'GET',
                url: this.ZOOM_BASE_API_URL + 'users/me/meetings',
                timeout: this.DEFAULT_TIMEOUT,
                params,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return data.data
        } catch (e) {
            console.log(e)
            throw new BadRequestException('Ошибка при получении встреч в zoom')
        }
    }

    async getMeetingDetails(meetingId: string) {
        const accessToken = await this.getToken()

        try {
            const data = await this.httpService.axiosRef.request<GetPastMeetingDetailsResponse>({
                method: 'GET',
                url: this.ZOOM_BASE_API_URL + `past_meetings/${meetingId}/participants`,
                timeout: this.DEFAULT_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return data.data
        } catch (e) {
            console.log(e)
            throw new BadRequestException(`Ошибка при получении сведений о встрече по zoom, id ${meetingId}`)
        }
    }

    async createMeeting(dto: CreateLessonDto, teacherId: number, studentId: number) {
        const accessToken = await this.getToken()

        const {
            User: { profile: teacherProfile },
        } = await this.prisma.teacher.findUnique({
            where: {
                id: teacherId,
            },
            select: {
                User: {
                    select: {
                        profile: {
                            select: {
                                name: true,
                                surname: true,
                            },
                        },
                    },
                },
            },
        })

        const {
            user: { profile: studentProfile },
        } = await this.prisma.student.findUnique({
            where: {
                id: studentId,
            },
            select: {
                user: {
                    select: {
                        profile: {
                            select: {
                                name: true,
                                surname: true,
                            },
                        },
                    },
                },
            },
        })

        try {
            const data = await this.httpService.axiosRef.request<{ id: number; join_url: string }>({
                method: 'POST',
                url: this.ZOOM_BASE_API_URL + 'users/me/meetings',
                timeout: this.DEFAULT_TIMEOUT,
                data: JSON.stringify({
                    topic: `Занятие ${teacherProfile.name} ${teacherProfile.surname} и ${studentProfile.name} ${studentProfile.surname}`,
                    start_time: dto.startDate.replace('.000Z', 'Z'),
                    type: this.DEFAULT_MEET_TYPE,
                    duration: this.DEFAULT_MEET_DURATION,
                    timezone: this.DEFAULT_MEET_TIMEZONE,
                    settings: {
                        waiting_room: false,
                        join_before_host: true,
                        jbh_time: 0,
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return data.data
        } catch (e) {
            console.log(e)
            throw new BadRequestException('Ошибка при создании встречи в zoom')
        }
    }

    async rescheduleMeeting(meetingId: number, start_time: string) {
        const accessToken = await this.getToken()

        try {
            const data = await this.httpService.axiosRef.request<{ id: number; join_url: string }>({
                method: 'PATCH',
                url: this.ZOOM_BASE_API_URL + 'meetings/' + meetingId,
                timeout: this.DEFAULT_TIMEOUT,
                data: {
                    start_time: start_time.replace('.000Z', 'Z'),
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return data.data
        } catch (e) {
            console.log(e)
            throw new BadRequestException('Ошибка при изменении встречи в zoom')
        }
    }

    async deleteMeeting(meetingId: number) {
        const accessToken = await this.getToken()

        try {
            const data = await this.httpService.axiosRef.request({
                method: 'DELETE',
                url: this.ZOOM_BASE_API_URL + 'meetings/' + meetingId,
                timeout: this.DEFAULT_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return data.data
        } catch (e) {
            console.log(e)
            throw new BadRequestException('Ошибка при удалении встречи в zoom')
        }
    }

    async lessonEnded(dto: EndedLessonWebhook) {
        if ('object' in dto.payload) {
            const meetingId = dto.payload.object.id

            const meetingDetails = await this.getMeetingDetails(meetingId)

            const participants = meetingDetails.participants

            const summedDurations = participants.reduce((acc, participant) => acc + participant.duration, 0)

            const lesson = await this.prisma.lesson.findFirst({
                where: {
                    meetingId: String(meetingId),
                },
            })

            if (lesson) {
                await this.prisma.lesson.update({
                    where: {
                        id: lesson.id,
                    },
                    data: {
                        lessonStatus:
                            summedDurations >= 2 * +process.env.LESSON_TIME_SECONDS_CONFIRM ?? 3000
                                ? LessonStatus.ALL_SUCCESS
                                : LessonStatus.UN_SUCCESS,
                    },
                })
            }
        }
    }
}
