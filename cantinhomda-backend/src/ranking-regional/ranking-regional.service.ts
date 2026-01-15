
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingRegionalService {
    constructor(private prisma: PrismaService) { }

    async getRegionalRanking(scope: { union?: string, region?: string, district?: string, association?: string, clubId?: string, regionalEventId?: string }) {
        const where: any = {
            participatesInRanking: true
        };

        console.log(`[RankingService] Calculating Ranking for scope:`, scope);

        if (scope.union && !scope.association && !scope.region && !scope.district) where.union = scope.union;
        if (scope.association) {
            where.OR = [
                { association: scope.association },
                { mission: scope.association }
            ];
        }
        if (scope.region) where.region = scope.region;
        if (scope.district) where.district = scope.district;
        if (scope.clubId) where.id = scope.clubId;

        const clubs = await this.prisma.club.findMany({
            where,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        console.log(`[RankingService] Found ${clubs.length} clubs matching scope.`);

        // Map to store points per club
        const clubPointsMap = new Map<string, { total: number, percentage: number, stars: number }>();

        if (scope.regionalEventId) {
            // 1. Get Event Requirements
            const eventRequirements = await this.prisma.requirement.findMany({
                where: { regionalEventId: scope.regionalEventId }
            });

            console.log(`[RankingService] Event ${scope.regionalEventId} has ${eventRequirements.length} requirements.`);

            if (eventRequirements.length > 0) {
                const totalPossiblePoints = eventRequirements.reduce((sum, r) => sum + (r.points || 0), 0);
                const reqIds = eventRequirements.map(r => r.id);

                // 2. Get All Approved Responses for these requirements
                // We filter by clubs found in scope to avoid calculating for out-of-scope clubs (though unlikely)
                const responses = await this.prisma.eventResponse.findMany({
                    where: {
                        requirementId: { in: reqIds },
                        status: 'APPROVED',
                        clubId: { in: clubs.map(c => c.id) }
                    },
                    include: { requirement: true }
                });

                console.log(`[RankingService] Found ${responses.length} APPROVED responses for this event across relevant clubs.`);

                // 3. Aggregate Points by Club
                for (const response of responses) {
                    const current = clubPointsMap.get(response.clubId) || { total: 0, percentage: 0, stars: 0 };
                    current.total += (response.requirement.points || 0);
                    clubPointsMap.set(response.clubId, current);
                }

                // 4. Calculate Percentage & Stars
                for (const [clubId, stats] of clubPointsMap.entries()) {
                    const percentage = totalPossiblePoints > 0
                        ? (stats.total / totalPossiblePoints) * 100
                        : 0;

                    let stars = 0;
                    if (stats.total > 0) {
                        if (percentage >= 90) stars = 5;
                        else if (percentage >= 75) stars = 4;
                        else if (percentage >= 50) stars = 3;
                        else if (percentage >= 25) stars = 2;
                        else stars = 1;
                    }

                    stats.percentage = Math.round(percentage); // Round for display
                    stats.stars = stars;
                    clubPointsMap.set(clubId, stats);
                }
            }
        } else {
            // Legacy / Global Points Calculation
            // Aggregate all user points for each club (?) or use cache.
            // Keeping previous simple logic: Sum of user.points

            // Optimization: Fetch all users for these clubs in one go? 
            // Better to simple loop for now as this is "else" case.
            for (const club of clubs) {
                const users = await this.prisma.user.findMany({
                    where: { clubId: club.id, isActive: true },
                    select: { points: true }
                });
                const total = users.reduce((sum, u) => sum + (u.points || 0), 0);
                clubPointsMap.set(club.id, { total, percentage: 0, stars: 0 });
            }
        }

        // Build Final Result
        const ranking = clubs.map(club => {
            const stats = clubPointsMap.get(club.id) || { total: 0, percentage: 0, stars: 0 };
            return {
                id: club.id,
                name: club.name,
                logoUrl: club.logoUrl,
                points: stats.total,
                percentage: stats.percentage,
                stars: stats.stars,
                memberCount: club._count.users
            };
        });

        // Sort by Points Descending
        return ranking.sort((a, b) => b.points - a.points);
    }
}
