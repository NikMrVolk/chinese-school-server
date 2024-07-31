import { Body, Controller, HttpCode, Param, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import { Auth } from 'src/utils/decorators'
import { FilesService } from './files.service'

@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Auth()
    @HttpCode(200)
    @Post(':filePath')
    async downloadFile(@Param('filePath') filePath: string, @Body('fileName') fileName: string, @Res() res: Response) {
        const fullFilePath = this.filesService.getExistingFilePath(filePath)

        res.setHeader('Content-Type', 'application/octet-stream')
        res.attachment(fileName)
        res.sendFile(fullFilePath)
    }
}
