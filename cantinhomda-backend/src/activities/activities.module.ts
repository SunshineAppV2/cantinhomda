import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ClubsModule } from '../clubs/clubs.module';
import { RequirementsModule } from '../requirements/requirements.module';

@Module({
    imports: [ClubsModule, RequirementsModule],
    controllers: [ActivitiesController],
    providers: [ActivitiesService, PrismaService],
    exports: [ActivitiesService]
})
export class ActivitiesModule { }
