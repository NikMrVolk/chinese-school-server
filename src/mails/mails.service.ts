import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import * as path from 'path'

@Injectable()
export class MailsService {
    constructor(private readonly mailerService: MailerService) {}

    async sendOtpCode(email: string, code: string) {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Проверочный код',
                template: 'otp',
                context: {
                    code,
                    path: path.join(__dirname, 'templates'),
                    logoLink: process.env.CLIENT_URL,
                    logoImageSrc: `${process.env.CLIENT_URL}/images/logo/blackLogo.${email.includes('@gmail.com') ? 'png' : 'svg'}`,
                },
            })
            return {
                success: true,
            }
        } catch (error) {
            console.error(error)
            return {
                success: false,
            }
        }
    }
}
