
import { Controller, Get, Query, UseGuards, Req, Param } from '@nestjs/common';
import { RankingRegionalService } from './ranking-regional.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ranking-regional')
export class RankingRegionalController {
    constructor(private readonly rankingService: RankingRegionalService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getRanking(@Req() req: any, @Query('district') district?: string, @Query('region') region?: string, @Query('association') association?: string, @Query('eventId') eventId?: string) {
        const user = req.user;
        console.log(`[RankingRegional] Request by User: ${user.email} (${user.role}) Scope Params:`, { district, region, association, eventId });

        let scope: any = { district, region, association, regionalEventId: eventId };

        // Restrição para Diretores: Ver apenas o próprio clube
        if (user.role === 'DIRECTOR' || user.role === 'OWNER' || user.role === 'ADMIN') {
            scope = { ...scope, clubId: user.clubId };
        }
        else if (user.role === 'COORDINATOR_DISTRICT') {
            scope = {
                ...scope,
                union: user.union,
                association: user.association || user.mission,
                region: user.region,
                district: user.district
            };
        }
        else if (user.role === 'COORDINATOR_REGIONAL') {
            scope = {
                ...scope,
                union: user.union,
                association: user.association || user.mission,
                region: user.region
            };
        }
        else if (user.role === 'COORDINATOR_AREA') {
            scope = {
                ...scope,
                union: user.union,
                association: user.association || user.mission
            };
        }

        // Final security check: ensure scope is not too broad for coordinators
        if (['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(user.role)) {
            let isIncomplete = false;

            if (!scope.association) {
                console.warn(`[RankingRegional] Coordinator ${user.email} is missing Association/Mission!`);
                isIncomplete = true;
            }

            if (user.role === 'COORDINATOR_REGIONAL' && !scope.region) {
                console.warn(`[RankingRegional] Regional Coordinator ${user.email} is missing Region!`);
                isIncomplete = true;
            }

            if (user.role === 'COORDINATOR_DISTRICT' && (!scope.region || !scope.district)) {
                console.warn(`[RankingRegional] District Coordinator ${user.email} is missing Region or District!`);
                isIncomplete = true;
            }

            if (isIncomplete) {
                console.warn(`[RankingRegional] Profile incomplete for role ${user.role}. Returning empty ranking.`);
                return []; // Return empty array if profile is incomplete
            }
        }

        console.log(`[RankingRegional] Final Effective Scope:`, scope);
        return this.rankingService.getRegionalRanking(scope);
    }

    @Get('debug/:term')
    async debugRanking(@Param('term') term: string) {
        // 1. Find Event
        const events = await this.rankingService['prisma'].regionalEvent.findMany({
            where: { title: { contains: term, mode: 'insensitive' } }
        });

        if (events.length === 0) return { message: 'No event found matching ' + term };

        const event = events[0];
        const results: any = {
            event: { id: event.id, title: event.title },
            requirements: [],
            responses: { total: 0, approved: 0, distinctClubs: 0 },
            sunshine_specific: null
        };

        // 2. Requirements
        const requirements = await this.rankingService['prisma'].requirement.findMany({
            where: { regionalEventId: event.id }
        });
        results.requirements = requirements.map(r => ({ id: r.id, title: r.title, points: r.points }));

        // 3. Responses
        const reqIds = requirements.map(r => r.id);
        const responses = await this.rankingService['prisma'].eventResponse.findMany({
            where: { requirementId: { in: reqIds } },
            include: { club: true, requirement: true }
        });

        results.responses.total = responses.length;
        results.responses.approved = responses.filter(r => r.status === 'APPROVED').length;

        const clubs = new Set(responses.map(r => r.club.name));
        results.responses.distinctClubs = clubs.size;

        // 4. Sunshine Specific
        const sunshineResponses = responses.filter(r => r.club.name.toLowerCase().includes('sunshine'));
        const sunshinePoints = sunshineResponses
            .filter(r => r.status === 'APPROVED')
            .reduce((sum, r) => sum + (r.requirement.points || 0), 0);

        results.sunshine_specific = {
            found_responses: sunshineResponses.length,
            statuses: sunshineResponses.map(r => ({ status: r.status, req: r.requirement.title, points: r.requirement.points })),
            calculated_points: sunshinePoints
        };

        return results;
    }
}
