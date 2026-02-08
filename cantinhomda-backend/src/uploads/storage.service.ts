import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { firebaseAdmin } from '../firebase-admin';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ];
    private readonly MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

    async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado.');
        }

        // Validate File Type (Secondary check)
        if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Tipo de arquivo não permitido. Apenas Imagens e PDF.');
        }

        // Validate Size (Secondary check)
        if (file.size > this.MAX_SIZE_BYTES) {
            throw new BadRequestException('Arquivo excede o tamanho máximo de 1MB.');
        }

        // PRIORITY: Use environment variable, then fallback to hardcoded default
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'cantinhodbv-dfdab.firebasestorage.app';

        this.logger.log(`[StorageService] Uploading to bucket: ${bucketName}`);

        try {
            const bucket = firebaseAdmin.storage().bucket(bucketName);

            // Generate unique filename
            const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            const filename = `${folder}/${Date.now()}_${Math.round(Math.random() * 10000)}_${cleanOriginalName}`;
            const fileUpload = bucket.file(filename);

            await fileUpload.save(file.buffer, {
                contentType: file.mimetype,
                public: true,
            });

            // Construct public URL
            // Format: https://storage.googleapis.com/<bucket>/<path>
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

            this.logger.log(`[StorageService] File uploaded successfully used public URL: ${publicUrl}`);
            return publicUrl;

        } catch (error) {
            this.logger.error(`[StorageService] Error uploading to bucket ${bucketName}: ${error.message}`, error.stack);
            throw new BadRequestException(`Erro ao fazer upload do arquivo: ${error.message}`);
        }
    }
}
