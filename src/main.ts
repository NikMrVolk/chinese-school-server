import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    app.setGlobalPrefix('api')
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe())
    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://nickmozav.online',
            'nickmozav.online',
            process.env.CLIENT_HOST,
            process.env.CLIENT_LANDING_HOST,
            'https://prostochinese.com',
            'https://www.prostochinese.com',
        ],
        credentials: true,
        exposedHeaders: 'set-cookie',
    })

    await app.listen(8000)
}
bootstrap()
