import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class EntityService {
    constructor(private prisma: PrismaService) {}

    /**
     * Retrieves an entity from the database by its ID.
     *
     * @template T - The type of the entity.
     * @param {string} entityName - The name of the entity.
     * @param {number} id - The ID of the entity.
     * @return {Promise<T | null>} A promise that resolves to the retrieved entity or null if not found.
     */
    async getById<T>(entityName: string, id: number): Promise<T | null> {
        const entity = await this.prisma[entityName].findUnique({
            where: {
                id,
            },
        })

        return entity || null
    }
}
