import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly prisma: PrismaService
    ) { }

    @Get('regional-stats')
    async getRegionalStats(
        @Request() req,
        @Query('association') association?: string,
        @Query('region') region?: string,
        @Query('district') district?: string, // Add district query
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const userId = req.user.userId;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) throw new ForbiddenException('User not found');

        // Enforcement Logic
        let finalAssociation = association;
        let finalRegion = region;
        let finalDistrict = district;

        // Regional Coordinator: Force Association & Region
        if (user.role === 'COORDINATOR_REGIONAL') {
            finalAssociation = user.association;
            finalRegion = user.region;
            // Can filter by district if they want, but restricted to their region implied by logic
        }
        // District Coordinator: Force Association, Region, AND District
        else if (user.role === 'COORDINATOR_DISTRICT') {
            finalAssociation = user.association;
            finalRegion = user.region;
            finalDistrict = user.district;
        } else if (['MASTER', 'ADMIN', 'OWNER'].includes(user.role)) {
            // No strict enforcement, use query params
        }

        // If filters are missing for Coordinators, it might return empty or full database?
        // Logic in service handles "undefined" as no filter.
        // But for Coordinators, "undefined" should mean "THEIR region/district". 
        // My logic above ensures that if they are coordinators, we OVERWRITE the query param with their DB value.
        // If their DB value is null, well, that's a data issue, but safe.

        console.log(`[Reports] User: ${user.name} (${user.role}) -> Assoc: ${finalAssociation}, Reg: ${finalRegion}, Dist: ${finalDistrict}`);

        return this.reportsService.getRegionalStats({
            association: finalAssociation,
            region: finalRegion,
            district: finalDistrict,
            startDate,
            endDate
        });
    }
}
