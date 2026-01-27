import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.systemSetting.findMany();
    }

    async findByKey(key: string) {
        return this.prisma.systemSetting.findUnique({
            where: { key },
        });
    }

    async update(key: string, value: string) {
        return this.prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
}
