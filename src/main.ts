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
        origin: ['http://localhost:3000', 'https://nickmozav.online', 'nickmozav.online', process.env.CLIENT_HOST],
        credentials: true,
        exposedHeaders: 'set-cookie',
    })

    await app.listen(8000)
}
bootstrap()
