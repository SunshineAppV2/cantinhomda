import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('uploads')
export class UploadsController {
    constructor(private readonly storageService: StorageService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/)) {
                return cb(new BadRequestException('Apenas arquivos de Imagem (JPG, PNG, WebP) e PDF são permitidos'), false);
            }
            cb(null, true);
        }
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado ou erro no upload.');
        }

        const publicUrl = await this.storageService.uploadFile(file);

        return {
            url: publicUrl,
        };
    }
}
