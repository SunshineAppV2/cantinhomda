import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
    imports: [PrismaModule, UploadsModule],
    controllers: [TreasuryController],
    providers: [TreasuryService],
})
export class TreasuryModule { }
