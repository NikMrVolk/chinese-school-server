import { Role } from '@prisma/client'

export enum Entity {
    USER = 'user',
    TARIFF = 'tariff',
}

export interface JwtPayload {
    id: number
    role: Role
    sessionId: number
}
