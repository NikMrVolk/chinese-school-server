import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { constants } from 'node:fs/promises'

import * as fs from 'fs'
import * as path from 'path'
import * as uuid from 'uuid'

@Injectable()
export class FilesService {
    async createFile(file: Express.Multer.File): Promise<string> {
        try {
            const fileExtension = path.extname(file.originalname)
            const fileName = uuid.v4() + fileExtension
            const filePath = path.resolve(__dirname, '..', '..', 'client')
            try {
                await fs.promises.access(filePath, constants.F_OK)
            } catch (e) {
                await fs.promises.mkdir(filePath, { recursive: true })
                console.error(e)
            }

            await fs.promises.writeFile(path.join(filePath, fileName), file.buffer)

            return fileName
        } catch (e) {
            console.error(e)
            throw new HttpException('Произошла ошибка при записи файла', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async deleteFile(fileName: string) {
        try {
            const filePath = path.resolve(__dirname, '..', '..', 'client', fileName)
            await fs.promises.unlink(filePath)
        } catch (e) {
            console.error(e)
            // throw new HttpException('Произошла ошибка при удалении файла', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
