
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingRegionalService {
    constructor(private prisma: PrismaService) { }

    async getRegionalRanking(scope: { union?: string, region?: string, district?: string, association?: string, clubId?: string, regionalEventId?: string }) {
        const where: any = {
            participatesInRanking: true // Only show clubs that participate
        };

        console.log(`[RankingService] Calculating Ranking for scope:`, scope);

        // If filtering by Event, we prioritize the event's scope logic? 
        // Actually, the event implies a scope (the clubs invited to it).
        // But for now we just filter the Requirements associated with this event.

        if (scope.union && !scope.association && !scope.region && !scope.district) {
            where.union = scope.union;
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
            // If regionalEventId is provided, we filter requirements linked to this event.
            // But 'users' query gathers points from 'ActivityLog' usually?
            // Wait, the previous logic was: `sum + (user.points || 0)`.
            // User.points is a global aggregate.
            // We need to calculate points dynamicallly suming `UserRequirement` points for this event.

            let totalPoints = 0;
            let possiblePoints = 0;

            if (scope.regionalEventId) {
                // Determine requirements for this event
                const eventRequirements = await this.prisma.requirement.findMany({
                    where: { regionalEventId: scope.regionalEventId }
                });

                if (eventRequirements.length > 0) {
                    const reqIds = eventRequirements.map(r => r.id);
                    possiblePoints = eventRequirements.reduce((sum, r) => sum + (r.points || 0), 0);

                    // Sum points from approved user requirements for this club
                    // Since "Director responds for Club", we might look for UserRequirements where user.clubId = club.id?
                    // Or specifically the Director's ID?
                    // To be safe and cover "Director" or "Any Member", let's sum ALL approved requirements from users in this club.
                    const approved = await this.prisma.userRequirement.findMany({
                        where: {
                            requirementId: { in: reqIds },
                            user: { clubId: club.id },
                            status: 'APPROVED'
                        },
                        include: { requirement: true }
                    });

                    // Avoid double counting if multiple users do the same task? 
                    // If it's a "Club Task", only one should do it.
                    // If multiple do, do we sum?
                    // For now, simple sum. Max cap could be possiblePoints, but let's just sum.
                    totalPoints = approved.reduce((sum, ur) => sum + (ur.requirement.points || 0), 0);
                } else {
                    // No requirements for this event?
                    totalPoints = 0;
                    possiblePoints = 1; // Avoid division by zero
                }

            } else {
                // Default Global Ranking (Global Points)
                const users = await this.prisma.user.findMany({
                    where: { clubId: club.id, isActive: true },
                    select: { points: true }
                });
                totalPoints = users.reduce((sum, user) => sum + (user.points || 0), 0);
                possiblePoints = 10000; // Legacy / Default Goal
            }
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
