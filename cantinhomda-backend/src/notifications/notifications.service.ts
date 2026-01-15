import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        // private gateway: NotificationsGateway // Removed for Vercel/Firestore migration
    ) { }

    async send(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type
            }
        });

        try {
            const admin = await import('firebase-admin');
            if (admin.apps.length > 0) {
                await admin.firestore().collection('notifications').add({
                    ...notification,
                    createdAt: new Date(), // Ensure Firestore understands the date
                    read: false
                });
            }
        } catch (e) {
            console.warn('Failed to sync notification to Firestore:', e);
        }

        return notification;
    }

    async findAllForUser(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
    }

    async markAsRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { read: true }
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
    }

    async sendGlobal(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
        const users = await this.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true }
        });

        if (users.length === 0) return { count: 0 };

        await this.prisma.notification.createMany({
            data: users.map(user => ({
                userId: user.id,
                title,
                message,
                type,
                read: false,
                createdAt: new Date()
            }))
        });

        try {
            const admin = await import('firebase-admin');
            if (admin.apps.length > 0) {
                const db = admin.firestore();
                let batch = db.batch();
                let opCount = 0;

                for (const user of users) {
                    const ref = db.collection('notifications').doc();
                    batch.set(ref, {
                        userId: user.id,
                        title,
                        message,
                        type,
                        read: false,
                        createdAt: new Date()
                    });
                    opCount++;

                    if (opCount >= 400) {
                        await batch.commit();
                        batch = db.batch();
                        opCount = 0;
                    }
                }

                if (opCount > 0) {
                    await batch.commit();
                }
            }
        } catch (e) {
            console.warn('Failed to sync global notifications to Firestore:', e);
        }

        return { count: users.length };
    }
}
