import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionalEventDto } from './dto/create-regional-event.dto';
import { UpdateRegionalEventDto } from './dto/update-regional-event.dto';

@Injectable()
export class RegionalEventsService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateRegionalEventDto & { clubIds?: string[] }, creatorId: string) {
        const { clubIds, ...rest } = createDto;
        return this.prisma.regionalEvent.create({
            data: {
                ...rest,
                creatorId,
                participatingClubs: clubIds?.length ? {
                    connect: clubIds.map(id => ({ id }))
                } : undefined
            }
        });
    }

    async findAll(user: { role: string; region?: string; district?: string; clubId?: string }) {
        const { role, region, district, clubId } = user;
        const where: any = {};

        // 1. Coordinator/Master View
        if (role === 'COORDINATOR_REGIONAL') {
            where.region = region;
        } else if (role === 'COORDINATOR_DISTRICT') {
            where.OR = [
                { district: district },
                { region: region, district: null }
            ];
        } else if (role === 'COORDINATOR_AREA') {
            where.association = user['association'] || user['mission'];
        } else if (['MASTER'].includes(role)) {
            // See ALL
        } else {
            // 2. Club View (Strict Participation + Legacy Fallback)
            if (!clubId) return [];

            const club = await this.prisma.club.findUnique({ where: { id: clubId } });
            if (!club) return [];

            // Logic:
            // - Show if Club is explicitly in participatingClubs
            // - OR if no participatingClubs defined AND matches Region/District (Legacy/Open)

            const legacyConditions: any[] = [];
            if (club.district) legacyConditions.push({ district: club.district });
            if (club.region) legacyConditions.push({ region: club.region, district: null });
            // Association check if needed

            where.OR = [
                { participatingClubs: { some: { id: clubId } } },
                ...legacyConditions
            ];
        }

        return this.prisma.regionalEvent.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: {
                _count: { select: { requirements: true } },
                participatingClubs: { select: { id: true, name: true } } // Return participants so UI knows
            }
        });
    }

    async findOne(id: string, user: any) {
        const userId = user.userId || user.id;
        const userRole = user.role;

        let clubId: string | undefined = user.clubId;
        const isCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA', 'MASTER'].includes(userRole);

        // Fetch basic event info first to determine scope
        const eventBase = await this.prisma.regionalEvent.findUnique({
            where: { id },
            include: { participatingClubs: { select: { id: true } } }
        });

        if (!eventBase) throw new NotFoundException('Evento não encontrado');

        // Logic for Total Clubs (Denominator)
        let totalClubsCount = eventBase.participatingClubs.length;

        // If open event (0 participating clubs defined), we estimate based on scope (Region/District)
        if (totalClubsCount === 0 && isCoordinator) {
            // Count all clubs in the event's scope (or coordinator's scope fallback)
            // Simplified: User's scope
            const whereClub: any = {};
            if (user.region) whereClub.region = user.region;
            if (user.district) whereClub.district = user.district;

            totalClubsCount = await this.prisma.club.count({ where: whereClub });
        }

        const includeConfig: any = {
            requirements: {
                orderBy: { code: 'asc' },
                include: {}
            }
        };

        if (isCoordinator) {
            // Coordinator View: Fetch Stats
            // We need counts of APPROVED responses per requirement
            // Prisma doesn't support complex nested aggregation easily in one include without raw query or separate query.
            // But we can include ALL responses (heavy?) or just use _count if structured right.
            // Using _count for relation filters is possible.
            includeConfig.requirements.include = {
                eventResponses: {
                    select: { status: true } // We fetch status to count in JS (easier than raw SQL for now)
                }
            };
        } else {
            // Club View: Fetch Only My Response
            includeConfig.requirements.include = {
                eventResponses: clubId ? {
                    where: { clubId },
                    select: { status: true, completedAt: true, answerText: true, answerFileUrl: true }
                } : false
            };
        }

        const event: any = await this.prisma.regionalEvent.findUnique({
            where: { id },
            include: includeConfig
        });

        if (isCoordinator) {
            // Process Stats
            event.requirements = event.requirements.map((req: any) => {
                const totalResponses = req.eventResponses?.length || 0;
                const completed = req.eventResponses?.filter((r: any) => r.status === 'APPROVED').length || 0;
                const pending = req.eventResponses?.filter((r: any) => r.status === 'PENDING').length || 0;

                // percentage based on Total Clubs Expected
                // Prevent division by zero
                const safeTotal = totalClubsCount || 1;
                const percentage = Math.round((completed / safeTotal) * 100);

                // Clean up responses array from output to save bandwidth if not needed (optional)
                delete req.eventResponses;

                return {
                    ...req,
                    stats: {
                        completed,
                        pending,
                        totalExpected: totalClubsCount,
                        percentage
                    }
                };
            });
        }

        console.log(`[RegionalEvents] findOne View. ID: ${id}, Role: ${userRole}`);
        return event;
    }

    async update(id: string, updateDto: UpdateRegionalEventDto & { clubIds?: string[] }) {
        const { clubIds, ...rest } = updateDto;
        const data: any = { ...rest };

        if (clubIds) {
            data.participatingClubs = {
                set: clubIds.map(cid => ({ id: cid })) // Replace existing
            };
        }

        return this.prisma.regionalEvent.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        return this.prisma.regionalEvent.delete({
            where: { id }
        });
    }
    async subscribe(eventId: string, clubId: string) {
        console.log(`[RegionalEvents] Subscribing Club ${clubId} to Event ${eventId}`);
        return this.prisma.regionalEvent.update({
            where: { id: eventId },
            data: {
                participatingClubs: {
                    connect: { id: clubId }
                }
            }
        });
    }

    async unsubscribe(eventId: string, clubId: string) {
        return this.prisma.regionalEvent.update({
            where: { id: eventId },
            data: {
                participatingClubs: {
                    disconnect: { id: clubId }
                }
            }
        });
    }

    // --- Event Evaluation (EventResponse Entity) ---

    async submitResponse(eventId: string, requirementId: string, clubId: string, userId: string, data: { text?: string, file?: string }) {
        // Check if already approved (Prevent tampering after approval)
        const existing = await this.prisma.eventResponse.findUnique({
            where: { clubId_requirementId: { clubId, requirementId } }
        });

        if (existing && existing.status === 'APPROVED') {
            throw new UnauthorizedException('Este requisito já foi aprovado e não pode ser alterado.');
        }

        return this.prisma.eventResponse.upsert({
            where: {
                clubId_requirementId: {
                    clubId,
                    requirementId
                }
            },
            update: {
                answerText: data.text,
                answerFileUrl: data.file,
                status: 'PENDING',
                submittedByUserId: userId,
                updatedAt: new Date()
            },
            create: {
                clubId,
                requirementId,
                answerText: data.text,
                answerFileUrl: data.file,
                submittedByUserId: userId,
                status: 'PENDING'
            }
        });
    }

    async getEventResponses(eventId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') {
        return this.prisma.eventResponse.findMany({
            where: {
                requirement: { regionalEventId: eventId },
                status: status
            },
            include: {
                club: { select: { id: true, name: true, region: true, district: true } },
                requirement: { select: { id: true, title: true, code: true, points: true, type: true } },
                submittedBy: { select: { id: true, name: true, photoUrl: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async approveResponse(responseId: string, coordinatorId: string) {
        return this.prisma.eventResponse.update({
            where: { id: responseId },
            data: {
                status: 'APPROVED',
                completedAt: new Date(),
                comments: null // Clear previous rejection reasons if any
            }
        });
    }

    async rejectResponse(responseId: string, coordinatorId: string, reason?: string) {
        return this.prisma.eventResponse.update({
            where: { id: responseId },
            data: {
                status: 'REJECTED',
                comments: reason,
                completedAt: new Date()
            }
        });
    }

    async revokeResponse(responseId: string, coordinatorId: string) {
        // Reset to PENDING so it can be re-evaluated
        return this.prisma.eventResponse.update({
            where: { id: responseId },
            data: {
                status: 'PENDING',
                completedAt: null
            }
        });
    }

    async deleteResponse(responseId: string, coordinatorId: string) {
        return this.prisma.eventResponse.delete({
            where: { id: responseId }
        });
    }
}
