import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from 'src/prisma.service'
import { AuthDto } from '../auth/dto/auth.dto'

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async getUsers() {
        return this.prisma.user.findMany({
            select: {
                name: true,
                email: true,
                id: true,
                password: false,
            },
        })
    }

    async getById(id: number) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
        })
    }

    async getByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
        })
    }

    async create(dto: AuthDto) {
        const users = await this.getUsers()

        const user = {
            id: users.length + 1,
            email: dto.email,
            name: dto.email,
            password: await bcrypt.hash(dto.password, 7),
        }

        return this.prisma.user.create({
            data: user,
        })
    }
}
