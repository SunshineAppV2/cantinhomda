
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

        let bucketName = 'unknown';
        try {
            // Use configured bucket or fallback to the known correct one from FIREBASE_CONFIG
            // Default behavior often tries project-id.appspot.com which might not exist
            bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'cantinhodbv-dfdab.firebasestorage.app';

            // Fix: Render/Env might have the wrong default 'appspot.com' which doesn't exist for this project
            if (bucketName.includes('appspot.com')) {
                console.warn(`[Uploads] Detected likely incorrect bucket '${bucketName}'. Switching to 'firebasestorage.app'.`);
                bucketName = bucketName.replace('.appspot.com', '.firebasestorage.app');
            }

            const bucket = firebaseAdmin.storage().bucket(bucketName);

            const filename = `${Date.now()}_${Math.round(Math.random() * 10000)}_${file.originalname}`;
            const fileUpload = bucket.file(`uploads/${filename}`);

            await fileUpload.save(file.buffer, {
                contentType: file.mimetype,
                public: true, // Make public
            });

            // Construct public URL
            const publicUrl = `https://storage.googleapis.com/${bucketName}/uploads/${filename}`;

            // Frontend expects { url: ... }
            return {
                url: publicUrl,
            };
        } catch (error) {
            console.error(`Upload Error (Bucket: ${bucketName}):`, error);

            // Diagnostics: Check who we are and what we can see
            try {
                const projectId = process.env.FIREBASE_PROJECT_ID;
                const email = process.env.FIREBASE_CLIENT_EMAIL;
                console.log(`[Diagnostics] Project: ${projectId}, Email: ${email}`);

                const [buckets] = await (firebaseAdmin.storage() as any).getBuckets();
                const bucketNames = buckets.map(b => b.name);
                console.log(`[Diagnostics] Available Buckets: ${bucketNames.join(', ')}`);

                // If we found buckets, hint the user
                if (bucketNames.length > 0 && !bucketNames.includes(bucketName)) {
                    throw new BadRequestException(`Bucket não encontrado. Buckets disponíveis: ${bucketNames.join(', ')}`);
                }
            } catch (diagError) {
                console.error('[Diagnostics] Failed to run diagnostics:', diagError);
            }

            throw new BadRequestException(`Erro ao salvar arquivo no bucket '${bucketName}': ${error.message || error}`);
        }
    }
}
