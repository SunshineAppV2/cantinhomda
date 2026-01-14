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

    async findOne(id: string, userId?: string) {
        let clubId: string | undefined;
        if (userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { clubId: true } });
            clubId = user?.clubId || undefined;
        }

        const event = await this.prisma.regionalEvent.findUnique({
            where: { id },
            include: {
                requirements: {
                    include: {
                        eventResponses: clubId ? {
                            where: { clubId },
                            select: { status: true, completedAt: true, answerText: true, answerFileUrl: true }
                        } : false
                    }
                }
            }
        });
        if (!event) throw new NotFoundException('Evento não encontrado');

        console.log(`[RegionalEvents] findOne View. ID: ${id}, User: ${userId}`);
        if (event.requirements?.length > 0) {
            console.log(`[RegionalEvents] Req 1 Sample:`, JSON.stringify(event.requirements[0]));
        }

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

    async getPendingResponses(eventId: string, user: any) {
        // Fetch from EventResponse
        return this.prisma.eventResponse.findMany({
            where: {
                requirement: { regionalEventId: eventId },
                status: 'PENDING'
            },
            include: {
                club: { select: { id: true, name: true, region: true, district: true } },
                requirement: { select: { id: true, title: true, code: true, points: true, type: true } },
                submittedBy: { select: { id: true, name: true, photoUrl: true } }
            },
            orderBy: { updatedAt: 'asc' }
        });
    }

    async approveResponse(responseId: string, coordinatorId: string) {
        // TODO: Validate Permissions
        return this.prisma.eventResponse.update({
            where: { id: responseId },
            data: {
                status: 'APPROVED',
                completedAt: new Date()
            }
        });
    }

    async rejectResponse(responseId: string, coordinatorId: string, reason?: string) {
        return this.prisma.eventResponse.update({
            where: { id: responseId },
            data: {
                status: 'REJECTED',
                comments: reason
            }
        });
    }
}
