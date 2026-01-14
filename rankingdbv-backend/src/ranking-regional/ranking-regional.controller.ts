
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { RankingRegionalService } from './ranking-regional.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ranking-regional')
export class RankingRegionalController {
    constructor(private readonly rankingService: RankingRegionalService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getRanking(@Req() req: any, @Query('district') district?: string, @Query('region') region?: string, @Query('association') association?: string) {
        const user = req.user;
        console.log(`[RankingRegional] Request by User: ${user.email} (${user.role}) Scope Params:`, { district, region, association });

        let scope: any = { district, region, association };

        // Restrição para Diretores: Ver apenas o próprio clube
        if (user.role === 'DIRECTOR' || user.role === 'OWNER' || user.role === 'ADMIN') {
            scope = { clubId: user.clubId };
        }
        else if (user.role === 'COORDINATOR_DISTRICT') {
            scope = {
                union: user.union,
                association: user.association || user.mission,
                region: user.region,
                district: user.district
            };
        }
        else if (user.role === 'COORDINATOR_REGIONAL') {
            scope = {
                union: user.union,
                association: user.association || user.mission,
                region: user.region
            };
        }
        else if (user.role === 'COORDINATOR_AREA') {
            scope = {
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
}
