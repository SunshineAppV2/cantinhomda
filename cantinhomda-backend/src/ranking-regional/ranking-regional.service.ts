
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingRegionalService {
    constructor(private prisma: PrismaService) { }

    async getRegionalRanking(scope: { union?: string, region?: string, district?: string, association?: string, clubId?: string, regionalEventId?: string, period?: 'YEAR' | 'QUARTER' | 'MONTH', date?: string }) {
        const where: any = {};

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
            // General Ranking (Sum of all events in the period)
            // 1. Determine Date Range
            const referenceDate = scope.date ? new Date(scope.date) : new Date();
            const year = referenceDate.getFullYear();

            let startDate: Date;
            let endDate: Date;

            if (scope.period === 'MONTH') {
                const month = referenceDate.getMonth();
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
            } else if (scope.period === 'QUARTER') {
                const month = referenceDate.getMonth();
                const quarterStartMonth = Math.floor(month / 3) * 3;
                startDate = new Date(year, quarterStartMonth, 1);
                endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
            } else {
                // Default: YEAR
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59, 999);
            }

            console.log(`[RankingService] General Ranking Period: ${scope.period || 'YEAR'} Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

            // 2. Find Events in Range & Scope
            const eventWhere: any = {
                startDate: {
                    gte: startDate,
                    lte: endDate
                }
            };

            // Apply geographic scope to events as well? 
            // Usually events are regional/district specific, so we should filter events that match the user's scope.
            // However, a club participates in events of its region/district.
            // Let's filter events that are applicable to the requested scope.
            if (scope.union) eventWhere.union = scope.union;
            if (scope.association) {
                eventWhere.OR = [
                    { association: scope.association },
                    { mission: scope.association }
                ];
            }
            if (scope.region) eventWhere.region = scope.region;
            if (scope.district) eventWhere.district = scope.district;


            const eventsInRange = await this.prisma.regionalEvent.findMany({
                where: eventWhere,
                include: { requirements: true }
            });

            console.log(`[RankingService] Found ${eventsInRange.length} events in range.`);

            // 3. Calculate Total Possible Points (Sum of requirements of all found events)
            let totalPossiblePoints = 0;
            const allReqIds: string[] = [];

            for (const evt of eventsInRange) {
                const eventTotal = evt.requirements.reduce((sum, r) => sum + (r.points || 0), 0);
                totalPossiblePoints += eventTotal;
                allReqIds.push(...evt.requirements.map(r => r.id));
            }

            // 4. Get Approved Responses for these events & clubs
            if (allReqIds.length > 0) {
                const responses = await this.prisma.eventResponse.findMany({
                    where: {
                        requirementId: { in: allReqIds },
                        status: 'APPROVED',
                        clubId: { in: clubs.map(c => c.id) }
                    },
                    include: { requirement: true }
                });

                console.log(`[RankingService] Found ${responses.length} APPROVED responses for General Ranking.`);

                // 5. Aggregate
                for (const response of responses) {
                    const current = clubPointsMap.get(response.clubId) || { total: 0, percentage: 0, stars: 0 };
                    current.total += (response.requirement.points || 0);
                    clubPointsMap.set(response.clubId, current);
                }

                // 6. Calculate Percentage & Stars
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

                    stats.percentage = Math.round(percentage);
                    stats.stars = stars;
                    clubPointsMap.set(clubId, stats);
                }
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
