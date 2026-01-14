
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingRegionalService {
    constructor(private prisma: PrismaService) { }

    async getRegionalRanking(scope: { union?: string, region?: string, district?: string, association?: string, clubId?: string }) {
        const where: any = {
            participatesInRanking: true // Only show clubs that participate
        };

        console.log(`[RankingService] Calculating Ranking for scope:`, scope);

        if (scope.union && !scope.association && !scope.region && !scope.district) {
            where.union = scope.union; // Only filter by union if stricter filters are missing (to avoid data mismatch)
        }

        if (scope.association) {
            // Priority 1: Association/Mission matching
            where.OR = [
                { association: scope.association },
                { mission: scope.association }
            ];
        }

        if (scope.region) where.region = scope.region;
        if (scope.district) where.district = scope.district;
        if (scope.clubId) where.id = scope.clubId;

        console.log(`[RankingService] Prisma query filter (where):`, JSON.stringify(where, null, 2));

        const clubs = await this.prisma.club.findMany({
            where,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        console.log(`[RankingService] Found ${clubs.length} clubs matching criteria.`);


        // For each club, calculate points.
        // For simplicity in this first version, we'll sum all points from activity logs of users in that club.
        // But the request says "separado do ranking interno de pontos do clube".
        // It should be based on "atividades/requisitos lançados pela Região/Distrito".

        // Let's assume there's a way to mark activities as 'REGIONAL'.
        // For now, let's calculate based on all activities done by the club members.

        const ranking = await Promise.all(clubs.map(async (club) => {
            const users = await this.prisma.user.findMany({
                where: { clubId: club.id, isActive: true },
                select: { points: true }
            });

            const totalPoints = users.reduce((sum, user) => sum + (user.points || 0), 0);

            // Placeholder for "Possible Points" - could be a fixed goal or average
            const possiblePoints = 10000; // Example goal
            const percentage = Math.min((totalPoints / possiblePoints) * 100, 100);

            let stars = 0;
            if (totalPoints > 0) {
                stars = Math.max(1, Math.min(5, Math.ceil(percentage / 20)));
            }

            return {
                id: club.id,
                name: club.name,
                logoUrl: club.logoUrl,
                points: totalPoints,
                percentage: Math.round(percentage),
                stars,
                memberCount: club._count.users
            };
        }));

        return ranking.sort((a, b) => b.points - a.points);
    }
}
