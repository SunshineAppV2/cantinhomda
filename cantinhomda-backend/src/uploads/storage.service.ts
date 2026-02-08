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
        let bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'cantinhodbv-dfdab.firebasestorage.app';

        this.logger.log(`[StorageService] Initial attempt uploading to bucket: ${bucketName}`);

        try {
            return await this.performUpload(file, folder, bucketName);
        } catch (error: any) {
            // Check if error is 404 (Bucket not found) and if we haven't tried the alternative name yet
            if (error?.code === 404 || error?.message?.includes('bucket does not exist')) {
                this.logger.warn(`[StorageService] Bucket '${bucketName}' not found. Trying fallback...`);

                // Try switching suffixes
                let alternativeName = bucketName;
                if (bucketName.includes('firebasestorage.app')) {
                    alternativeName = bucketName.replace('firebasestorage.app', 'appspot.com');
                } else if (bucketName.includes('appspot.com')) {
                    alternativeName = bucketName.replace('appspot.com', 'firebasestorage.app');
                }

                if (alternativeName !== bucketName) {
                    this.logger.log(`[StorageService] Retrying upload with alternative bucket: ${alternativeName}`);
                    try {
                        return await this.performUpload(file, folder, alternativeName);
                    } catch (retryError: any) {
                        this.logger.error(`[StorageService] Fallback failed: ${retryError.message}`);
                        throw new BadRequestException(`Erro ao fazer upload (falha no bucket principal e alternativo): ${error.message}`);
                    }
                }
            }

            this.logger.error(`[StorageService] Error uploading to bucket ${bucketName}: ${error.message}`, error.stack);
            throw new BadRequestException(`Erro ao fazer upload do arquivo: ${error.message}`);
        }
    }

    private async performUpload(file: Express.Multer.File, folder: string, bucketName: string): Promise<string> {
        const bucket = firebaseAdmin.storage().bucket(bucketName);

        // Generate unique filename
        const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${folder}/${Date.now()}_${Math.round(Math.random() * 10000)}_${cleanOriginalName}`;
        const fileUpload = bucket.file(filename);

        await fileUpload.save(file.buffer, {
            contentType: file.mimetype,
            public: true,
        });

        // Construct public URL. Note: Public URL usually uses storage.googleapis.com
        // We can keep using the bucket name in the URL if it's a valid GCS path.
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

        this.logger.log(`[StorageService] File uploaded successfully used public URL: ${publicUrl}`);
        return publicUrl;
    }
}
