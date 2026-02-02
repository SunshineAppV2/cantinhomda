
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// const uploadDir = 'G:/Ranking DBV/IMAGENS'; // Removed logic
import { firebaseAdmin } from '../firebase-admin';

@Controller('uploads')
export class UploadsController {
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|pdf)$/)) {
                return cb(new BadRequestException('Apenas arquivos JPEG, JPG e PDF são permitidos'), false);
            }
            cb(null, true);
        }
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado ou erro no upload.');
        }

        try {
            const bucket = firebaseAdmin.storage().bucket();
            const filename = `${Date.now()}_${Math.round(Math.random() * 10000)}_${file.originalname}`;
            const fileUpload = bucket.file(`uploads/${filename}`);

            await fileUpload.save(file.buffer, {
                contentType: file.mimetype,
                public: true, // Make public
            });

            // Construct public URL
            // If storageBucket is configured properly, we can use the default domain
            // Otherwise, we construct it manually assuming standard pattern
            const bucketName = bucket.name;
            const publicUrl = `https://storage.googleapis.com/${bucketName}/uploads/${filename}`;

            // Frontend expects { url: ... }
            return {
                url: publicUrl,
            };
        } catch (error) {
            console.error('Upload Error:', error);
            throw new BadRequestException('Erro ao salvar arquivo no Storage.');
        }
    }
}
