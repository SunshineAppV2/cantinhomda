import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
    constructor(private prisma: PrismaService) { }

    async getConfig() {
        // Try to get config from database, or return defaults
        try {
            const config = await this.prisma.systemConfig.findFirst();
            return config || { referralEnabled: false };
        } catch {
            // If table doesn't exist yet, return defaults
            return { referralEnabled: false };
        }
    }

    async updateConfig(data: any) {
        // Upsert config (create or update)
        const existing = await this.prisma.systemConfig.findFirst();

        if (existing) {
            return this.prisma.systemConfig.update({
                where: { id: existing.id },
                data
            });
        } else {
            return this.prisma.systemConfig.create({
                data
            });
        }
    }
}
