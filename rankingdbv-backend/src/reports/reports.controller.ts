import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('regional-stats')
    // @Roles('MASTER', 'COORDINATOR_REGIONAL', 'COORDINATOR_AREA', 'COORDINATOR_DISTRICT') // Add roles as needed
    async getRegionalStats(
        @Query('association') association?: string,
        @Query('region') region?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.getRegionalStats({
            association,
            region,
            startDate,
            endDate
        });
    }
}
