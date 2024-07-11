import { Module } from '@nestjs/common'
import { TariffsController } from './tariffs.controller'
import { TariffsService } from './tariffs.service'
import { PrismaService } from 'src/prisma.service'
import { EntityService } from '../utils/services/entity.service'

@Module({
    controllers: [TariffsController],
    providers: [PrismaService, EntityService, TariffsService],
})
export class TariffsModule {}
