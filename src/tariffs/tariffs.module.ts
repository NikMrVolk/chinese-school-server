import { Module } from '@nestjs/common'
import { TariffsController } from './tariffs.controller'
import { TariffsService } from './tariffs.service'
import { PrismaService } from 'src/prisma.service'
import { EntityService } from '../utils/services/entity.service'
import { JwtService } from '@nestjs/jwt'

@Module({
    controllers: [TariffsController],
    providers: [PrismaService, EntityService, TariffsService, JwtService],
    exports: [TariffsService],
})
export class TariffsModule {}
