
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

        return this.calculateRanking(clubs, scope, clubPointsMap);
    }

    private async calculateRanking(clubs: any[], scope: any, clubPointsMap: Map<string, any>) {
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

                    stats.percentage = Math.round(percentage); // Round for display
                    stats.stars = this.calculateStars(percentage);
                    clubPointsMap.set(clubId, stats);
                }
            }
        } else {
            // General Ranking (Sum of all events in the period)
            // 1. Determine Date Range
            const { startDate, endDate } = this.getDateRange(scope);

            console.log(`[RankingService] General Ranking Period: ${scope.period || 'YEAR'} Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

            // 2. Find Events in Range & Scope
            const eventWhere = this.getEventScopeWhere(scope, startDate, endDate);

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

                    stats.percentage = Math.round(percentage);
                    stats.stars = this.calculateStars(percentage);
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

    async getClubRankingDetails(clubId: string, scope: any) {
        // Similar logic to General Ranking but identifying specific responses
        // 1. Determine events in scope
        let eventsInRange: any[] = [];
        let allReqIds: string[] = [];

        if (scope.regionalEventId) {
            const evt = await this.prisma.regionalEvent.findUnique({
                where: { id: scope.regionalEventId },
                include: { requirements: true }
            });
            if (evt) {
                eventsInRange = [evt];
                allReqIds = evt.requirements.map(r => r.id);
            }
        } else {
            const { startDate, endDate } = this.getDateRange(scope);
            const eventWhere = this.getEventScopeWhere(scope, startDate, endDate);
            eventsInRange = await this.prisma.regionalEvent.findMany({
                where: eventWhere,
                include: { requirements: true }
            });

            for (const evt of eventsInRange) {
                allReqIds.push(...evt.requirements.map(r => r.id));
            }
        }

        if (allReqIds.length === 0) return [];

        const responses = await this.prisma.eventResponse.findMany({
            where: {
                requirementId: { in: allReqIds },
                status: 'APPROVED',
                clubId: clubId
            },
            include: {
                requirement: {
                    include: { regionalEvent: true }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        return responses.map(r => ({
            id: r.id,
            eventName: r.requirement.regionalEvent?.title || 'Evento Desconhecido',
            requirementTitle: r.requirement.title,
            points: r.requirement.points,
            date: r.completedAt || r.createdAt
        }));
    }

    private calculateStars(percentage: number): number {
        if (percentage >= 90) return 5;
        if (percentage >= 75) return 4;
        if (percentage >= 50) return 3;
        if (percentage >= 25) return 2;
        return 1;
    }

    private getDateRange(scope: any) {
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
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }
        return { startDate, endDate };
    }

    private getEventScopeWhere(scope: any, startDate: Date, endDate: Date) {
        const eventWhere: any = {
            startDate: { gte: startDate, lte: endDate }
        };

        const scopeConditions: any[] = [];

        // 1. Logic for District View
        if (scope.district && scope.region) {
            scopeConditions.push(
                { district: scope.district },
                { region: scope.region, district: null },
            );
            if (scope.association) {
                scopeConditions.push({ association: scope.association, region: null, district: null });
            }
        }
        // 2. Logic for Regional View
        else if (scope.region) {
            scopeConditions.push({ region: scope.region });
            if (scope.association) {
                scopeConditions.push({ association: scope.association, region: null });
            }
        }
        // 3. Logic for Association View
        else if (scope.association) {
            scopeConditions.push({ association: scope.association });
        }

        if (scopeConditions.length > 0) {
            eventWhere.OR = scopeConditions;
        } else {
            if (scope.union) eventWhere.union = scope.union;
            if (scope.association) eventWhere.association = scope.association;
            if (scope.region) eventWhere.region = scope.region;
            if (scope.district) eventWhere.district = scope.district;
        }
        return eventWhere;
    }
}
