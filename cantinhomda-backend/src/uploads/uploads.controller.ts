
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// const uploadDir = 'G:/Ranking DBV/IMAGENS'; // Removed logic

@Controller('uploads')
export class UploadsController {
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado ou erro no upload.');
        }

        try {
            const admin = await import('firebase-admin');
            if (admin.apps.length === 0) {
                throw new Error('Firebase Admin not initialized');
            }

            const bucket = admin.storage().bucket();
            const filename = `${Date.now()}_${Math.round(Math.random() * 10000)}_${file.originalname}`;
            const fileUpload = bucket.file(`uploads/${filename}`);

            await fileUpload.save(file.buffer, {
                contentType: file.mimetype,
                public: true, // Make public for now (simplest for migration)
            });

            // Construct public URL
            // Format: https://storage.googleapis.com/[BUCKET_NAME]/[PATH]
            // Or use getSignedUrl if private.
            // For now, assuming standard Firebase Storage bucket access
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${filename}`;

            return {
                url: publicUrl,
                filename: filename,
                originalName: file.originalname,
            };
        } catch (error) {
            console.error('Upload Error:', error);
            throw new BadRequestException('Erro ao salvar arquivo no Storage.');
        }
    }
}
