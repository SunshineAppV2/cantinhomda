import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { HIERARCHY_DATA, UNIONS_LIST } from './data/hierarchy.data';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubsService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async onModuleInit() {
        // Backfill Referral Codes for existing clubs
        const clubsWithoutCode = await this.prisma.club.findMany({
            where: { referralCode: null }
        });

        if (clubsWithoutCode.length > 0) {
            console.log(`[Referral] Backfilling codes for ${clubsWithoutCode.length} clubs...`);
            for (const club of clubsWithoutCode) {
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: { referralCode: this.generateReferralCode() }
                });
            }
            console.log('[Referral] Backfill complete.');
        }
    }

    private generateReferralCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async resolveReferralCode(code: string): Promise<string | null> {
        const club = await this.prisma.club.findUnique({
            where: { referralCode: code },
            select: { id: true }
        });
        return club ? club.id : null;
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 7);
    }

    async create(createClubDto: CreateClubDto & { referrerClubId?: string }) {
        const slug = this.generateSlug(createClubDto.name);

        return this.prisma.club.create({
            data: {
                name: createClubDto.name,
                slug,
                region: createClubDto.region,
                district: createClubDto.district,
                association: createClubDto.association,
                mission: createClubDto.mission,
                union: createClubDto.union,
                referralCode: this.generateReferralCode(),
                referrerClubId: createClubDto.referrerClubId,
                phoneNumber: createClubDto.phoneNumber, // Add phone number support
                settings: createClubDto.settings || undefined,
                memberLimit: createClubDto.settings?.memberLimit && !isNaN(Number(createClubDto.settings.memberLimit))
                    ? Number(createClubDto.settings.memberLimit)
                    : 30, // Default to 30 safe limit
                planTier: 'PLAN_P', // Default to initial plan
                nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), // Trial for 1 month?
                subscriptionStatus: 'TRIAL'
            },
        });
    }

    async createAndAssignOwner(createClubDto: CreateClubDto, ownerId: string) {
        const club = await this.create(createClubDto);

        // Update the owner user to be OWNER and link to this club
        await this.prisma.user.update({
            where: { id: ownerId },
            data: {
                clubId: club.id,
                role: 'OWNER',
                isActive: true // Ensure they are active
            }
        });

        return club;
    }

    async awardReferralCredit(referrerClubId: string) {
        const referrerClub = await this.prisma.club.findUnique({
            where: { id: referrerClubId },
            include: { referralCredits: { where: { status: 'AVAILABLE' } } }
        });

        if (!referrerClub) return;

        const activeCredits = referrerClub.referralCredits.length;

        if (activeCredits >= 3) {
            console.log(`[Referral] Club ${referrerClub.name} reached max credits (3). No new credit awarded.`);
            return;
        }

        // Logic: 1st = 30d, 2nd = 60d, 3rd = 90d from NOW.
        const days = (activeCredits + 1) * 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        await this.prisma.referralCredit.create({
            data: {
                clubId: referrerClub.id,
                expiresAt: expiresAt,
                status: 'AVAILABLE'
            }
        });

        console.log(`[Referral] Awarded credit to ${referrerClub.name}. Expires in ${days} days.`);

        // Notify Owner
        const owner = await this.prisma.user.findFirst({ where: { clubId: referrerClub.id, role: 'OWNER' } });
        if (owner) {
            await this.notificationsService.send(
                owner.id,
                'Nova Indicação Confirmada!',
                `Sua indicação realizou o primeiro pagamento e você ganhou um desconto de 20%! (Válido por ${days} dias)`,
                'SUCCESS'
            );
        }
    }

    async getExportData(clubId: string) {
        return this.prisma.club.findUnique({
            where: { id: clubId },
            include: {
                users: {
                    include: {
                        specialties: true,
                        requirements: true,
                        // Include profile fields automatically
                    }
                },
                activities: {
                    include: {
                        logs: true
                    }
                },
                units: true,
                meetings: {
                    include: {
                        attendances: true
                    }
                },
                transactions: true,
                products: {
                    include: {
                        purchases: true
                    }
                },
                events: {
                    include: {
                        registrations: true
                    }
                }
            }
        });
    }

    // Assuming getReferralReport method would be here, ending with the return block below
    // async getReferralReport(clubId: string) {
    //     // ... some logic ...
    //     return {
    //         totalReferrals,
    //         totalCredits,
    //         totalUsed,
    //         totalAvailable,
    //         clubs: clubsWithReferrals
    //     };
    // }

    async getDashboardStats(clubId: string) {
        // Get members count
        const membersCount = await this.prisma.user.count({
            where: { clubId, isActive: true }
        });

        // Get upcoming birthdays (next 30 days)
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        const users = await this.prisma.user.findMany({
            where: { clubId, isActive: true, birthDate: { not: null } },
            select: { birthDate: true }
        });

        const upcomingBirthdays = users.filter(user => {
            if (!user.birthDate) return false;
            const birthDate = new Date(user.birthDate);
            const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            return thisYearBirthday >= today && thisYearBirthday <= nextMonth;
        }).length;

        // Get next event
        const nextEvent = await this.prisma.event.findFirst({
            where: {
                clubId,
                startDate: { gte: today }
            },
            orderBy: { startDate: 'asc' },
            select: {
                id: true,
                title: true,
                startDate: true
            }
        });

        // Get financial balance
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId, status: 'COMPLETED' },
            select: { type: true, amount: true }
        });

        const balance = transactions.reduce((acc, t) => {
            return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
        }, 0);

        return {
            membersCount,
            upcomingBirthdays,
            nextEvent,
            balance
        };
    }

    async findAll(user?: any) {
        const where: any = {};

        if (user) {
            const isMaster = user.email === 'master@cantinhomda.com' || user.role === 'MASTER' || user.role === 'OWNER'; // Owner sees all? Or just their club? Usually Owner=ClubOwner.
            // Wait, OWNER is Club Owner. Only Master is Super Admin.
            const isSuperAdmin = user.email === 'master@cantinhomda.com' || user.role === 'MASTER';

            if (!isSuperAdmin) {
                if (user.role === 'COORDINATOR_REGIONAL') {
                    if (user.region) where.region = user.region;
                } else if (user.role === 'COORDINATOR_DISTRICT') {
                    if (user.district) where.district = user.district;
                } else if (user.role === 'COORDINATOR_AREA') {
                    if (user.association) where.association = user.association;
                }
                // If normal user/club admin, maybe restrict?
                // Current usage of /clubs might be for "Select your club" in Register?
                // Unauthenticated /public endpoint exists for that.
                // Authenticated /clubs is used for... what?
                // If used for dropdown in RegionalRequirements, this filtering is perfect.
            }
        }

        return this.prisma.club.findMany({
            where,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }

    async getAllClubsDetailed(currentUser?: any) {
        const where: any = {};

        if (currentUser) {
            const isMaster = currentUser.email === 'master@cantinhomda.com' || currentUser.role === 'MASTER';
            if (!isMaster && ['COORDINATOR_AREA', 'COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT'].includes(currentUser.role)) {

                const association = currentUser.association || currentUser.mission;
                if (!association) return []; // STRICT: No association, no clubs.

                if (currentUser.role === 'COORDINATOR_REGIONAL' && !currentUser.region) return [];
                if (currentUser.role === 'COORDINATOR_DISTRICT' && (!currentUser.region || !currentUser.district)) return [];

                // Ensure they always filter by their own Union/Association to prevent scope leakage
                if (currentUser.union) where.union = currentUser.union;
                where.OR = [
                    { association: association },
                    { mission: association }
                ];

                if (currentUser.role === 'COORDINATOR_DISTRICT') where.district = currentUser.district;
                if (currentUser.role === 'COORDINATOR_REGIONAL') where.region = currentUser.region;
            }
        }

        const clubs = await this.prisma.club.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        // Group active users by club and role type (broadly) is hard in one go.
        // Group by clubId and role
        const roleCounts = await this.prisma.user.groupBy({
            by: ['clubId', 'role'],
            where: { isActive: true },
            _count: { id: true }
        });

        // Fetch Directors (OWNER/ADMIN) for these clubs to get contact info
        const directors = await this.prisma.user.findMany({
            where: {
                clubId: { in: clubs.map(c => c.id) },
                role: { in: ['OWNER', 'DIRECTOR', 'ADMIN'] }, // Prioritize Owner/Director
                isActive: true
            },
            select: {
                clubId: true,
                name: true,
                mobile: true,
                role: true
            }
        });

        // Process results
        return clubs.map(club => {
            // Filter counts for this club
            const clubCounts = roleCounts.filter(rc => rc.clubId === club.id);

            let paid = 0;
            let free = 0;

            clubCounts.forEach(rc => {
                if (rc.role !== 'PARENT' && rc.role !== 'MASTER') {
                    paid += rc._count.id;
                } else {
                    free += rc._count.id;
                }
            });

            // Find Director
            const director = directors.find(d => d.clubId === club.id && (d.role === 'OWNER' || d.role === 'DIRECTOR'))
                || directors.find(d => d.clubId === club.id);

            return {
                ...club,
                activeMembers: paid,
                freeMembers: free,
                totalMembers: paid + free,
                directorName: director?.name || 'N/A',
                directorMobile: director?.mobile || null
            };
        });
    }

    async getRegions(association: string) {
        if (!association) return [];
        const clubs = await this.prisma.club.findMany({
            where: { association },
            select: { region: true },
            distinct: ['region'],
            orderBy: { region: 'asc' }
        });
        return clubs.map(c => c.region).filter(Boolean);
    }

    async getDistricts(region: string) {
        if (!region) return [];
        const clubs = await this.prisma.club.findMany({
            where: { region },
            select: { district: true },
            distinct: ['district'],
            orderBy: { district: 'asc' }
        });
        return clubs.map(c => c.district).filter(Boolean);
    }

    async search(query: string) {
        if (!query) return [];
        return this.prisma.club.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    // { region: { contains: query, mode: 'insensitive' } }, // Optional
                ]
            },
            take: 20
        });
    }

    async getHierarchyOptions() {
        // 1. Fetch distinct values from DB
        const [regions, missions, associations, districts, unions] = await Promise.all([
            this.prisma.club.findMany({
                select: { region: true },
                distinct: ['region'],
                where: {
                    AND: [
                        { region: { not: null } },
                        { region: { not: '' } }
                    ]
                },
                orderBy: { region: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { mission: true },
                distinct: ['mission'],
                where: {
                    AND: [
                        { mission: { not: null } },
                        { mission: { not: '' } }
                    ]
                },
                orderBy: { mission: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { association: true },
                distinct: ['association'],
                where: {
                    AND: [
                        { association: { not: null } },
                        { association: { not: '' } }
                    ]
                },
                orderBy: { association: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { district: true },
                distinct: ['district'],
                where: {
                    AND: [
                        { district: { not: null } },
                        { district: { not: '' } }
                    ]
                },
                orderBy: { district: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { union: true },
                distinct: ['union'],
                where: {
                    AND: [
                        { union: { not: null } },
                        { union: { not: '' } }
                    ]
                },
                orderBy: { union: 'asc' }
            })
        ]);

        // 2. Merge with Static Data

        // Unions: DB + Static
        const dbUnions = unions.map(u => u.union).filter(Boolean);
        const allUnions = Array.from(new Set([...UNIONS_LIST, ...dbUnions])).sort();

        // Associations/Missions: DB + Static (Hierarchical missions are flattened)
        const dbMissions = missions.map(m => m.mission).filter(Boolean);
        const dbAssociations = associations.map(a => a.association).filter(Boolean);
        const staticMissions = Object.values(HIERARCHY_DATA).flat();

        // Final associations list is a merge of all Association and Mission fields
        const allAssociations = Array.from(new Set([...staticMissions, ...dbMissions, ...dbAssociations])).sort();

        return {
            regions: regions.map(d => d.region).filter(Boolean),
            districts: districts.map(d => d.district).filter(Boolean),
            missions: allAssociations, // Backward compatibility for some old components
            associations: allAssociations, // New standard name
            unions: allUnions,
            hierarchyTree: HIERARCHY_DATA // Pass the tree for frontend filtering
        };
    }

    async getHierarchyTree() {
        const clubs = await this.prisma.club.findMany({
            select: { id: true, name: true, region: true, district: true, mission: true, union: true },
            orderBy: { name: 'asc' }
        });

        const tree: any = {};

        for (const club of clubs) {
            const u = club.union || 'Sem União';
            const m = club.mission || 'Sem Missão';
            const r = club.region || 'Sem Região';
            const d = club.district || 'Sem Distrito';

            if (!tree[u]) tree[u] = {};
            if (!tree[u][m]) tree[u][m] = {};
            if (!tree[u][m][r]) tree[u][m][r] = {};
            if (!tree[u][m][r][d]) tree[u][m][r][d] = [];

            tree[u][m][r][d].push({ id: club.id, name: club.name });
        }

        return tree;
    }

    async findOne(id: string) {
        return this.prisma.club.findUnique({
            where: { id },
            include: {
                users: true
            }
        });
    }

    async update(id: string, data: { name?: string; logoUrl?: string; settings?: any; union?: string; mission?: string; region?: string; district?: string; association?: string; phoneNumber?: string }) {
        return this.prisma.club.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.logoUrl && { logoUrl: data.logoUrl }),
                ...(data.settings && { settings: data.settings }),
                ...(data.union && { union: data.union }),
                ...(data.mission && { mission: data.mission }),
                ...(data.region && { region: data.region }),
                ...(data.district && { district: data.district }),
                ...(data.association && { association: data.association }),
                ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
            }
        });
    }

    async delete(id: string) {
        return this.prisma.club.delete({
            where: { id }
        });
    }

    async renameHierarchyNode(level: 'union' | 'mission' | 'region', oldName: string, newName: string) {
        if (!['union', 'mission', 'region'].includes(level)) {
            throw new Error('Nível inválido');
        }

        const updateData: any = {};
        updateData[level] = newName;

        const whereData: any = {};
        whereData[level] = oldName;

        return this.prisma.club.updateMany({
            where: whereData,
            data: updateData
        });
    }

    async deleteHierarchyNode(level: 'union' | 'mission' | 'region', name: string) {
        if (!['union', 'mission', 'region'].includes(level)) {
            throw new Error('Nível inválido');
        }

        const updateData: any = {};
        updateData[level] = null;

        const whereData: any = {};
        whereData[level] = name;

        return this.prisma.club.updateMany({
            where: whereData,
            data: updateData
        });
    }

    async getClubStatus(clubId: string) {
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            select: {
                id: true,
                name: true,
                planTier: true,
                memberLimit: true,
                subscriptionStatus: true,
                nextBillingDate: true,
                gracePeriodDays: true,
                referralCode: true,
                union: true,
                association: true,
                mission: true,
                region: true,
                district: true,
                referralCredits: {
                    where: { status: 'AVAILABLE' }
                }
            }
        });

        if (!club) throw new Error('Clube não encontrado');

        // Count Paid (All except Parents and Master)
        const paidCount = await this.prisma.user.count({
            where: {
                clubId,
                role: { notIn: ['PARENT', 'MASTER'] },
                isActive: true
            }
        });

        // Count Free (Parents + Master if any)
        const freeCount = await this.prisma.user.count({
            where: {
                clubId,
                role: { in: ['PARENT', 'MASTER'] },
                isActive: true
            }
        });

        return {
            ...club,
            activeMembers: paidCount,
            freeMembers: freeCount,
            totalMembers: paidCount + freeCount
        };
    }

    async updateSubscription(clubId: string, data: any) {
        const result = await this.prisma.club.update({
            where: { id: clubId },
            data: {
                planTier: data.planTier,
                memberLimit: Number(data.memberLimit),
                subscriptionStatus: data.subscriptionStatus,
                nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
                gracePeriodDays: Number(data.gracePeriodDays)
            }
        });

        // Auto-create Treasury Entry if payment amount is provided
        if (data.lastPaymentAmount && Number(data.lastPaymentAmount) > 0) {
            await this.prisma.masterTransaction.create({
                data: {
                    type: 'INCOME',
                    amount: Number(data.lastPaymentAmount),
                    description: `Assinatura - Plano ${data.planTier || result.planTier}`,
                    category: 'Assinatura',
                    sourceClubId: clubId,
                    date: new Date()
                }
            });
        }

        // 2. CHECK REFERRAL REWARD
        // If status became ACTIVE (meaning they paid) AND they have a referrer AND reward not claimed
        if (data.subscriptionStatus === 'ACTIVE') {
            const club = await this.prisma.club.findUnique({
                where: { id: clubId },
                select: { referrerClubId: true, referralRewardClaimed: true }
            });

            if (club && club.referrerClubId && !club.referralRewardClaimed) {
                console.log(`[Referral] Triggering reward for referrer ${club.referrerClubId} from club ${clubId}`);

                // Award Credit
                await this.awardReferralCredit(club.referrerClubId);

                // Mark as Claimed
                await this.prisma.club.update({
                    where: { id: clubId },
                    data: { referralRewardClaimed: true }
                });
            }
        }

        return result;
    }

    async bulkUpdateBillingDate(clubIds: string[], nextBillingDate: string, gracePeriodDays: number) {
        try {
            const date = new Date(nextBillingDate);

            // Use transaction to ensure all updates succeed or none do
            const result = await this.prisma.$transaction(
                clubIds.map(clubId =>
                    this.prisma.club.update({
                        where: { id: clubId },
                        data: {
                            nextBillingDate: date,
                            gracePeriodDays: Number(gracePeriodDays)
                        }
                    })
                )
            );

            return {
                success: true,
                updatedCount: result.length,
                clubIds: result.map(club => club.id)
            };
        } catch (error) {
            console.error('Error in bulk update:', error);
            throw new Error('Erro ao atualizar datas em massa. Verifique os IDs dos clubes.');
        }
    }

    async sendPaymentInfo(clubId: string, message?: string) {
        const club = await this.prisma.club.findUnique({ where: { id: clubId } });
        if (!club) throw new Error('Clube não encontrado');

        const admins = await this.prisma.user.findMany({
            where: {
                clubId,
                role: { in: ['OWNER', 'ADMIN'] },
                isActive: true
            },
            select: { id: true }
        });

        const finalMessage = message || `Olá! Sua assinatura do Ranking DBV está vencendo. Para renovar, faça um PIX para a chave: 68323280282 (Alex Oliveira Seabra) e envie o comprovante.`;

        for (const admin of admins) {
            await this.notificationsService.send(
                admin.id,
                'Renovação de Assinatura Ranking DBV',
                finalMessage,
                'WARNING'
            );
        }

        return { count: admins.length };
    }

    async checkWriteAccess(clubId: string) {
        if (!clubId) return;
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            select: {
                name: true,
                subscriptionStatus: true,
                nextBillingDate: true,
                gracePeriodDays: true
            }
        });

        if (!club) return; // Should allow or block? If club doesn't exist, we can't write to it anyway usually.

        let isOverdue = club.subscriptionStatus === 'OVERDUE' || club.subscriptionStatus === 'CANCELED';

        if (!isOverdue && club.nextBillingDate) {
            const today = new Date();
            const billingDate = new Date(club.nextBillingDate);
            const gracePeriod = (club.gracePeriodDays && !isNaN(Number(club.gracePeriodDays))) ? Number(club.gracePeriodDays) : 0;

            const cutoffDate = new Date(billingDate);
            cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);

            if (today > cutoffDate) {
                isOverdue = true;
            }
        }

        if (isOverdue) {
            throw new UnauthorizedException(`Ação Bloqueada: O clube ${club.name} está com assinatura vencida.`);
        }
    }
    async getReferralReport() {
        // 1. Get all clubs that were referred
        const referrals = await this.prisma.club.findMany({
            where: {
                referrerClubId: { not: null }
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                subscriptionStatus: true,
                referrerClubId: true,
                users: {
                    where: { role: 'OWNER' },
                    select: { name: true, mobile: true }
                }
            }
        });

        // 2. Get Referrer Info
        const referrerIds = [...new Set(referrals.map(r => r.referrerClubId).filter(Boolean))];
        const referrers = await this.prisma.club.findMany({
            where: { id: { in: referrerIds as string[] } },
            select: {
                id: true,
                name: true,
                users: {
                    where: { role: 'OWNER' },
                    select: { name: true }
                }
            }
        });

        // 3. Mount Report
        const report = referrers.map(referrer => {
            const myReferrals = referrals.filter(r => r.referrerClubId === referrer.id);
            const activeCount = myReferrals.filter(r => r.subscriptionStatus === 'ACTIVE').length;

            return {
                referrerId: referrer.id,
                referrerName: referrer.name,
                referrerDirector: referrer.users[0]?.name || 'N/A',
                totalIndications: myReferrals.length,
                validatedIndications: activeCount,
                details: myReferrals.map(r => ({
                    id: r.id,
                    name: r.name,
                    director: r.users[0]?.name || 'N/A',
                    mobile: r.users[0]?.mobile || '',
                    status: r.subscriptionStatus,
                    date: r.createdAt
                }))
            };
        });

        return report.sort((a, b) => b.totalIndications - a.totalIndications);
    }
}
