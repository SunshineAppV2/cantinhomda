import { Module } from '@nestjs/common';
import { RegionalEventsService } from './regional-events.service';
import { RegionalEventsController } from './regional-events.controller';
import { PrismaModule } from '../prisma/prisma.module';



@Module({
    imports: [PrismaModule],
    controllers: [RegionalEventsController],
    providers: [RegionalEventsService],
    exports: [RegionalEventsService]
})
export class RegionalEventsModule { }
