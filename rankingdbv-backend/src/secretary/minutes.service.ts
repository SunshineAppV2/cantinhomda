import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Minute, MinuteType, Prisma } from '@prisma/client';

@Injectable()
export class MinutesService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.MinuteCreateInput) {
        return this.prisma.minute.create({
            data,
        });
    }

    async findAll(clubId: string, type?: MinuteType) {
        const where: Prisma.MinuteWhereInput = { clubId };
        if (type) {
            where.type = type;
        }

        return this.prisma.minute.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                author: {
                    select: { name: true, photoUrl: true }
                }
            }
        });
    }

    async findOne(id: string) {
        const minute = await this.prisma.minute.findUnique({
            where: { id },
            include: {
                author: {
                    select: { name: true, photoUrl: true }
                }
            }
        });

        if (!minute) {
            throw new NotFoundException('Ata não encontrada');
        }

        return minute;
    }

    async update(id: string, data: Prisma.MinuteUpdateInput) {
        return this.prisma.minute.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.minute.delete({
            where: { id },
        });
    }
}
