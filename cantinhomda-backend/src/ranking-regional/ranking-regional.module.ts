
import { Module } from '@nestjs/common';
import { RankingRegionalService } from './ranking-regional.service';
import { RankingRegionalController } from './ranking-regional.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RankingRegionalController],
    providers: [RankingRegionalService],
    exports: [RankingRegionalService]
})
export class RankingRegionalModule { }
