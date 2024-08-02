import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Role } from '@prisma/client'
import { JwtPayload } from '../types'

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) {}

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest()
        const authorizationHeader = request.headers.authorization

        if (authorizationHeader) {
            const token = authorizationHeader.split(' ')[1]
            if (token) {
                try {
                    const { role } = this.jwt.verify<JwtPayload>(token, {
                        secret: process.env.JWT_SECRET,
                    })

                    if (role === Role.ADMIN) {
                        return true
                    }
                } catch (e) {
                    console.error(e)
                    throw new ForbiddenException('Invalid token')
                }
            }
        }
        throw new ForbiddenException('Invalid token')
    }
}
