import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { ActivitiesModule } from './activities/activities.module';
import { UnitsModule } from './units/units.module';
import { MeetingsModule } from './meetings/meetings.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { StoreModule } from './store/store.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TreasuryModule } from './treasury/treasury.module';
import { EventsModule } from './events/events.module';
import { RequirementsModule } from './requirements/requirements.module';
import { FaqsModule } from './faqs/faqs.module';
import { ClassesModule } from './classes/classes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SecretaryModule } from './secretary/secretary.module';

import { UploadsModule } from './uploads/uploads.module';
import { AchievementsModule } from './achievements/achievements.module';
import { MasterTreasuryModule } from './master-treasury/master-treasury.module';
import { PaymentsModule } from './payments/payments.module';
import { RankingRegionalModule } from './ranking-regional/ranking-regional.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

import { RegionalEventsModule } from './regional-events/regional-events.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    // ...
    RankingRegionalModule,
    SubscriptionsModule,
    RegionalEventsModule,
    ReportsModule,
    RequirementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
