import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getRegionalStats(filters: {
        association?: string;
        region?: string;
        district?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const { association, region, district, startDate, endDate } = filters;

        // 1. Build Club Filter
        const clubFilter: any = {};
        if (association) clubFilter.association = association;
        if (region) clubFilter.region = region;
        if (district) clubFilter.district = district;

        // Helper to get club IDs for further filtering
        const clubs = await this.prisma.club.findMany({
            where: clubFilter,
            select: { id: true }
        });
        const clubIds = clubs.map(c => c.id);

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

        // 2. Total Units
        const totalUnits = await this.prisma.unit.count({
            where: {
                clubId: { in: clubIds }
            }
        });

        // 3. User Stats (Members, Gender, Age)
        const users = await this.prisma.user.findMany({
            where: {
                clubId: { in: clubIds },
                status: 'ACTIVE' // Only active members
            },
            select: {
                id: true,
                sex: true,
                birthDate: true,
                role: true
            }
        });

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
            if (user.birthDate) {
                const birth = new Date(user.birthDate);
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                }

                if (age >= 10 && age <= 15) {
                    pathfindersCount++;
                } else if (age >= 16) {
                    staffCount++;
                }
            } else {
                // Fallback to Role if no birthdate
                if (user.role === 'PATHFINDER') pathfindersCount++;
                else staffCount++;
            }
        });

        // 4. Requirements Completed (in Date Range)
        const reqFilter: any = {
            status: 'APPROVED', // Assuming we count approved/completed
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

        return {
            totalMembers: users.length,
            totalUnits,
            pathfindersCount,
            staffCount,
            genderDistribution: { male, female },
            requirementsCompleted
        };
    }
}
