import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { YookassaService } from './yookassa.service'

@Module({
    imports: [HttpModule.register({})],
    providers: [YookassaService],
    exports: [YookassaService, HttpModule],
})
export class YookassaModule {}
