
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

        // If user is a coordinator, enforce their scope?
        // For now, let's allow them to pass the scope in query, but ideally we'd validate.

        let scope: any = { district, region, association };

        if (user.role === 'COORDINATOR_DISTRICT') scope = { district: user.district };
        if (user.role === 'COORDINATOR_REGIONAL') scope = { region: user.region };
        if (user.role === 'COORDINATOR_AREA') scope = { association: user.association };

        return this.rankingService.getRegionalRanking(scope);
    }
}
