import { Injectable } from '@nestjs/common'
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer'
import * as path from 'path'

@Injectable()
export class MailsService {
    constructor(private readonly mailerService: MailerService) {}

    async sendOtpCode(email: string, code: string) {
        await this.template({
            to: email,
            subject: 'Проверочный код',
            template: 'otp',
            context: {
                code,
                path: path.join(__dirname, 'templates'),
                logoLink: process.env.CLIENT_LANDING_URL,
                logoImageSrc: `${process.env.CLIENT_URL}/images/logo/blackLogo.${email.includes('@gmail.com') ? 'png' : 'svg'}`,
            },
        })
    }

    async sendRegistrationMail(email: string, password: string) {
        await this.template({
            to: email,
            subject: 'Регистрация',
            template: 'registration',
            context: {
                email,
                password,
                loginLink: `${process.env.CLIENT_URL}/auth`,
                path: path.join(__dirname, 'templates'),
                logoLink: process.env.CLIENT_LANDING_URL,
                logoImageSrc: `${process.env.CLIENT_URL}/images/logo/blackLogo.${email.includes('@gmail.com') ? 'png' : 'svg'}`,
            },
        })
    }

    async sendForgotPasswordMail(email: string, password: string) {
        await this.template({
            to: email,
            subject: 'Восстановление пароля',
            template: 'forgotPassword',
            context: {
                email,
                password,
                loginLink: `${process.env.CLIENT_URL}/auth`,
                path: path.join(__dirname, 'templates'),
                logoLink: process.env.CLIENT_LANDING_URL,
                logoImageSrc: `${process.env.CLIENT_URL}/images/logo/blackLogo.${email.includes('@gmail.com') ? 'png' : 'svg'}`,
            },
        })
    }

    async sendPaymentLinkMail(email: string, link: string) {
        await this.template({
            to: email,
            subject: 'Ссылка на оплату',
            template: 'paymentLink',
            context: {
                link,
                path: path.join(__dirname, 'templates'),
                logoLink: process.env.CLIENT_LANDING_URL,
                logoImageSrc: `${process.env.CLIENT_URL}/images/logo/blackLogo.${email.includes('@gmail.com') ? 'png' : 'svg'}`,
            },
        })
    }

    private async template(options: ISendMailOptions) {
        try {
            await this.mailerService.sendMail(options)
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
