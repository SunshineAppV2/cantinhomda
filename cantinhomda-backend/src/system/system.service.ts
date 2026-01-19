import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemService {
    // In-memory config until Prisma schema is updated with SystemConfig table
    private config = { referralEnabled: true };

    async getConfig() {
        return this.config;
    }

    async updateConfig(data: any) {
        this.config = { ...this.config, ...data };
        return this.config;
    }
}
