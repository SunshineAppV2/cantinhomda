import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PrismaModule } from '../prisma/prisma.module';

// Note: UploadsModule is not needed here as TreasuryController handles file uploads directly
@Module({
    imports: [PrismaModule],
    controllers: [TreasuryController],
    providers: [TreasuryService],
})
export class TreasuryModule { }
