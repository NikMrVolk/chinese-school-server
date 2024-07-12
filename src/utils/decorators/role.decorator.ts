import { UseGuards } from '@nestjs/common'
import { RoleGuard } from '../guards'

export const Admin = () => UseGuards(RoleGuard)
