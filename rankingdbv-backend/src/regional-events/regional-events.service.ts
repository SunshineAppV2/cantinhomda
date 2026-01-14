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

    async findOne(id: string) {
        const event = await this.prisma.regionalEvent.findUnique({
            where: { id },
            include: {
                requirements: {
                    include: {
                        // Include progress for current user? Passed in logic needed?
                        // For now just requirements
                    }
                }
            }
        });
        if (!event) throw new NotFoundException('Evento não encontrado');
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
}
