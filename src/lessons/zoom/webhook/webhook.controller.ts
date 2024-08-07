import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { WebhookService } from './webhook.service'
import { EndedLessonWebhook } from './webhook.types'

@Controller('zoom/webhook')
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}

    @HttpCode(200)
    @Post()
    async webhook(@Body() dto: EndedLessonWebhook) {
        console.log('Zoom послал запрос')
        console.log(dto)
        return this.webhookService.lessonEnded(dto)
    }
}
