
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(params: {
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
        ipAddress?: string;
        authorId?: string;
        clubId?: string;
    }) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: params.action,
                    resource: params.resource,
                    resourceId: params.resourceId,
                    details: params.details,
                    ipAddress: params.ipAddress,
                    authorId: params.authorId,
                    clubId: params.clubId
                }
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking: Audit logging failure shouldn't crash the main request primarily, 
            // but in high-security contexts it should. For now, we log to console.
        }
    }
}
