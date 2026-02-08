import { Module, Global } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
    controllers: [UploadsController],
    providers: [StorageService],
    exports: [StorageService],
})
export class UploadsModule { }
