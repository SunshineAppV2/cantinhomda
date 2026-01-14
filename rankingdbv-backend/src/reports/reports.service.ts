import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getRegionalStats(filters: {
        association?: string;
        region?: string;
        district?: string;
        clubId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const { association, region, district, clubId, startDate, endDate } = filters;
        console.log('[Reports] getRegionalStats Filters:', filters);

        // 1. Build Club Filter
        const clubFilter: any = { status: 'ACTIVE' }; // Only ACTIVE clubs
        if (association) clubFilter.association = association;
        if (region) clubFilter.region = region;
        if (district) clubFilter.district = district;
        if (clubId) clubFilter.id = clubId;

        // Helper to get club IDs for further filtering
        const clubs = await this.prisma.club.findMany({
            where: clubFilter,
            select: { id: true, name: true }
        });
        const clubIds = clubs.map(c => c.id);
        console.log(`[Reports] Found ${clubs.length} clubs matching filters.`);
        if (clubs.length > 0) console.log(`[Reports] Sample Club: ${clubs[0].name}`);

        if (clubIds.length === 0) {
            return {
                totalMembers: 0,
                totalUnits: 0,
                pathfindersCount: 0,
                staffCount: 0,
                genderDistribution: { male: 0, female: 0 },
                requirementsCompleted: 0
            };
        }

        // 2. Units Stats
        const unitStats: any = await this.prisma.unit.groupBy({
            by: ['type'],
            where: {
                clubId: { in: clubIds }
            },
            _count: {
                id: true
            }
        });

        const activeUnits = {
            masculine: 0,
            feminine: 0,
            mixed: 0,
            total: 0
        };

        unitStats.forEach(stat => {
            if (stat.type === 'MASCULINA') activeUnits.masculine = stat._count.id;
            else if (stat.type === 'FEMININA') activeUnits.feminine = stat._count.id;
            else if (stat.type === 'MISTA') activeUnits.mixed = stat._count.id;
            activeUnits.total += stat._count.id;
        });

        // 3. User Stats (Members, Gender, Age)
        // Note: Using 'ACTIVE' status. Ensure users are indeed ACTIVE.
        const users = await this.prisma.user.findMany({
            where: {
                clubId: { in: clubIds },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                sex: true,
                birthDate: true,
                role: true
            }
        });
        console.log(`[Reports] Found ${users.length} ACTIVE users.`);

        let male = 0;
        let female = 0;
        let pathfindersCount = 0; // 10-15
        let staffCount = 0; // 16+ or Role Based

        const today = new Date();

        users.forEach(user => {
            // Gender
            if (user.sex === 'M' || user.sex === 'Masculino') male++;
            else if (user.sex === 'F' || user.sex === 'Feminino') female++;

            // Age / Role
            let isPathfinder = false;
            if (user.birthDate) {
                const birth = new Date(user.birthDate);
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                }

                if (age >= 10 && age <= 15) {
                    pathfindersCount++;
                    isPathfinder = true;
                } else if (age >= 16) {
                    staffCount++;
                }
            }

            // Fallback to Role if no birthdate match (or if age calc failed/missed)
            // But we shouldn't double count if birthdate logic worked.
            // Let's rely on Role if Birthdate didn't classify as Pathfinder/Staff?
            // Actually, Role is safer for "Diretoria" vs "Desbravador".
            // Let's do: Use Role as primary source of truth for "Type"?
            // Or prioritize Age?
            // User requested: "Desbravadores (10-15)" and "Diretoria (16+)"
            // So age is the requested metric.
            // If no birthdate, checks role.
            if (!user.birthDate) {
                if (['PATHFINDER', 'CAPTAIN', 'SCRIBE'].includes(user.role)) pathfindersCount++;
                else staffCount++;
            }
        });

        // 4. Requirements Completed (in Date Range)
        const reqFilter: any = {
            status: 'APPROVED',
            user: {
                clubId: { in: clubIds }
            }
        };

        if (startDate && endDate) {
            reqFilter.updatedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const requirementsCompleted = await this.prisma.userRequirement.count({
            where: reqFilter
        });
        console.log(`[Reports] Requirements Completed: ${requirementsCompleted}`);

        return {
            totalMembers: users.length,
            totalUnits: activeUnits.total,
            unitStats: activeUnits,
            pathfindersCount,
            staffCount,
            genderDistribution: { male, female },
            requirementsCompleted
        };
    }
}
