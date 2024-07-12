import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../utils/guards/jwt.guard'

export const Auth = () => UseGuards(JwtAuthGuard)
