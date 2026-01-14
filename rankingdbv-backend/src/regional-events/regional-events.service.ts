import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionalEventDto } from './dto/create-regional-event.dto';
import { UpdateRegionalEventDto } from './dto/update-regional-event.dto';

@Injectable()
export class RegionalEventsService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateRegionalEventDto, creatorId: string) {
        return this.prisma.regionalEvent.create({
            data: {
                ...createDto,
                creatorId
            }
        });
    }

    async findAll(user: { role: string; region?: string; district?: string; clubId?: string }) {
        const { role, region, district, clubId } = user;
        const where: any = {};

        // 1. Regional/District Coordinator: See created events or events in their scope
        if (role === 'COORDINATOR_REGIONAL') {
            where.region = region;
        } else if (role === 'COORDINATOR_DISTRICT') {
            where.OR = [
                { district: district },
                { region: region, district: null }
            ];
        } else if (role === 'COORDINATOR_AREA') {
            // See events for their Association
            where.association = user['association'] || user['mission'];
        } else if (['MASTER'].includes(role)) {
            return this.prisma.regionalEvent.findMany({
                include: { _count: { select: { requirements: true } } },
                orderBy: { startDate: 'desc' }
            });
        } else {
            if (!clubId) return [];

            const club = await this.prisma.club.findUnique({ where: { id: clubId } });
            if (!club) return [];

            where.OR = [];

            if (club.district) where.OR.push({ district: club.district });
            if (club.region) where.OR.push({ region: club.region, district: null });
            if (club.association || club.mission) where.OR.push({ association: club.association || club.mission, region: null, district: null });
        }

        return this.prisma.regionalEvent.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: {
                _count: { select: { requirements: true } }
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

    async update(id: string, updateDto: UpdateRegionalEventDto) {
        return this.prisma.regionalEvent.update({
            where: { id },
            data: updateDto
        });
    }

    async remove(id: string) {
        return this.prisma.regionalEvent.delete({
            where: { id }
        });
    }
}
