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
    @Get('regional-stats')
    async getRegionalStats(
        @Request() req,
        @Query('association') association?: string,
        @Query('region') region?: string,
        @Query('district') district?: string,
        @Query('clubId') clubId?: string,
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
        let finalClubId = clubId;

        // Regional Coordinator: Force Association & Region
        if (user.role === 'COORDINATOR_REGIONAL') {
            if (!user.association || !user.region) throw new ForbiddenException('Perfil incompleto para Coordenador Regional');
            finalAssociation = user.association;
            finalRegion = user.region;
            // Coordinator can filter by specific club within their region
        }
        // District Coordinator: Force Association, Region, AND District
        else if (user.role === 'COORDINATOR_DISTRICT') {
            if (!user.association || !user.region || !user.district) throw new ForbiddenException('Perfil incompleto para Coordenador Distrital');
            finalAssociation = user.association;
            finalRegion = user.region;
            finalDistrict = user.district;
        }
        // Director/Owner/Admin: Force Club ID
        else if (['DIRECTOR', 'OWNER', 'ADMIN'].includes(user.role)) {
            finalClubId = user.clubId || undefined;
        }

        console.log(`[Reports] User: ${user.name} (${user.role}) -> Assoc: ${finalAssociation}, Reg: ${finalRegion}, Dist: ${finalDistrict}, Club: ${finalClubId}`);

        return this.reportsService.getRegionalStats({
            association: finalAssociation,
            region: finalRegion,
            district: finalDistrict,
            clubId: finalClubId,
            startDate,
            endDate
        });
    }
}
