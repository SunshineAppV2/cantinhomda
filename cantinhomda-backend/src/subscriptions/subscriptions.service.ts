import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentType } from '@prisma/client';

// Configuração de preços
export const SUBSCRIPTION_CONFIG = {
    PRICE_PER_MEMBER_MONTHLY: 2.00, // R$ 2,00 por membro/mês
    WHATSAPP_NUMBER: '5591983292005',
    WHATSAPP_MESSAGE: 'Olá! Gostaria de regularizar minha assinatura do Cantinho DBV.',
    WARNING_DAYS: [7, 3, 1], // Dias antes do vencimento para alertar
    GRACE_PERIOD_DAYS: 5, // Dias de carência após vencimento
};

export interface PaymentMetadata {
    memberCount?: number;
    months?: number;
    startDate?: Date;
    newMemberLimit?: number;
    planName?: string;
    billingCycle?: string;
}

export interface CanAddMemberResult {
    canAdd: boolean;
    currentCount: number;
    memberLimit: number;
    reason?: string;
}

@Injectable()
export class SubscriptionsService {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ============================================
    // MEMBER LIMIT CHECKS
    // ============================================

    /**
     * Verificar se pode adicionar membro ao clube
     */
    async canAddMember(clubId: string): Promise<CanAddMemberResult> {
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!club) {
            return { canAdd: false, currentCount: 0, memberLimit: 0, reason: 'Clube não encontrado' };
        }

        const currentCount = club._count.users;
        const memberLimit = club.memberLimit || 30;

        // Verificar status da assinatura
        if (club.subscriptionStatus === 'CANCELED') {
            return { canAdd: false, currentCount, memberLimit, reason: 'Assinatura cancelada' };
        }

        // Verificar se está em período de OVERDUE
        if (club.subscriptionStatus === 'OVERDUE') {
            return { canAdd: false, currentCount, memberLimit, reason: 'Assinatura em atraso' };
        }

        // Verificar limite de membros
        if (currentCount >= memberLimit) {
            return { canAdd: false, currentCount, memberLimit, reason: 'Limite de membros atingido' };
        }

        return { canAdd: true, currentCount, memberLimit };
    }

    /**
     * Obter contagem atual de membros do clube
     */
    async getCurrentMemberCount(clubId: string): Promise<number> {
        const count = await this.prisma.user.count({
            where: {
                clubId,
                status: { not: 'BLOCKED' }
            }
        });
        return count;
    }

    // ============================================
    // PAYMENT MANAGEMENT
    // ============================================

    /**
     * Criar pagamento pendente após aprovação de cadastro
     */
    async createPendingPayment(
        clubId: string,
        amount: number,
        description: string,
        metadata: PaymentMetadata,
        type: PaymentType = PaymentType.SUBSCRIPTION
    ) {
        // Calcular data de expiração do pagamento (24 horas)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const payment = await this.prisma.payment.create({
            data: {
                clubId,
                type,
                amount,
                status: PaymentStatus.PENDING,
                paymentMethod: 'pix',
                description,
                metadata: metadata as any,
                expiresAt
            },
            include: {
                club: {
                    select: { id: true, name: true, phoneNumber: true }
                }
            }
        });

        this.logger.log(`Payment created: ${payment.id} for club ${clubId} - R$ ${amount}`);
        return payment;
    }

    /**
     * Confirmar pagamento (Master recebe PIX e confirma manualmente)
     */
    async confirmPayment(paymentId: string, confirmedBy: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { club: true }
        });

        if (!payment) {
            throw new NotFoundException('Pagamento não encontrado');
        }

        if (payment.status === PaymentStatus.CONFIRMED) {
            throw new BadRequestException('Pagamento já foi confirmado');
        }

        const metadata = payment.metadata as PaymentMetadata || {};

        // Calcular nova data de vencimento
        const months = metadata.months || 1;
        let startDate = new Date();

        // Se o clube já tem vencimento futuro, estender a partir dele
        if (payment.club.nextBillingDate && payment.club.nextBillingDate > new Date()) {
            startDate = new Date(payment.club.nextBillingDate);
        }

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);

        // Atualizar pagamento
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.CONFIRMED,
                confirmedAt: new Date(),
                confirmedBy
            }
        });

        // Preparar dados de atualização do clube
        const clubUpdateData: any = {
            subscriptionStatus: 'ACTIVE',
            nextBillingDate: endDate
        };

        // Se for adição de membros, atualizar limite
        if (payment.type === PaymentType.MEMBER_ADDITION && metadata.newMemberLimit) {
            clubUpdateData.memberLimit = metadata.newMemberLimit;
        } else if (payment.type === PaymentType.SUBSCRIPTION && metadata.memberCount) {
            clubUpdateData.memberLimit = metadata.memberCount;
        }

        // Atualizar clube
        await this.prisma.club.update({
            where: { id: payment.clubId },
            data: clubUpdateData
        });

        this.logger.log(`Payment ${paymentId} confirmed by ${confirmedBy}. Club ${payment.clubId} active until ${endDate}`);

        return {
            success: true,
            message: 'Pagamento confirmado com sucesso',
            nextBillingDate: endDate
        };
    }

    /**
     * Estornar/Reverter pagamento
     */
    async refundPayment(paymentId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { club: true }
        });

        if (!payment) {
            throw new NotFoundException('Pagamento não encontrado');
        }

        const metadata = payment.metadata as PaymentMetadata || {};

        // Se pagamento estava confirmado, reverter efeitos
        if (payment.status === PaymentStatus.CONFIRMED) {
            if (payment.type === PaymentType.SUBSCRIPTION && metadata.months) {
                // Reverter datas
                const currentEndDate = payment.club.nextBillingDate;
                if (currentEndDate) {
                    const newEndDate = new Date(currentEndDate);
                    newEndDate.setMonth(newEndDate.getMonth() - metadata.months);

                    const newStatus = newEndDate < new Date() ? 'OVERDUE' : 'ACTIVE';

                    await this.prisma.club.update({
                        where: { id: payment.clubId },
                        data: {
                            nextBillingDate: newEndDate,
                            subscriptionStatus: newStatus as any
                        }
                    });
                }
            } else if (payment.type === PaymentType.MEMBER_ADDITION && metadata.memberCount) {
                // Reduzir limite de membros
                const currentLimit = payment.club.memberLimit || 30;
                await this.prisma.club.update({
                    where: { id: payment.clubId },
                    data: {
                        memberLimit: Math.max(1, currentLimit - metadata.memberCount)
                    }
                });
            }
        }

        // Atualizar status do pagamento
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: PaymentStatus.REFUNDED }
        });

        this.logger.log(`Payment ${paymentId} refunded`);

        return { success: true, message: 'Pagamento estornado com sucesso' };
    }

    /**
     * Deletar pagamento
     */
    async deletePayment(paymentId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) {
            throw new NotFoundException('Pagamento não encontrado');
        }

        // Se confirmado, fazer estorno antes
        if (payment.status === PaymentStatus.CONFIRMED) {
            await this.refundPayment(paymentId);
        }

        await this.prisma.payment.delete({
            where: { id: paymentId }
        });

        return { success: true, message: 'Pagamento deletado' };
    }

    // ============================================
    // QUERIES
    // ============================================

    /**
     * Listar pagamentos de um clube
     */
    async getClubPayments(clubId: string) {
        return this.prisma.payment.findMany({
            where: { clubId },
            orderBy: { createdAt: 'desc' },
            include: {
                confirmedByUser: {
                    select: { id: true, name: true }
                }
            }
        });
    }

    /**
     * Listar todos os pagamentos pendentes (para Master)
     */
    async getPendingPayments() {
        return this.prisma.payment.findMany({
            where: { status: PaymentStatus.PENDING },
            orderBy: { createdAt: 'asc' },
            include: {
                club: {
                    select: { id: true, name: true, phoneNumber: true, union: true, association: true }
                }
            }
        });
    }

    /**
     * Obter status da assinatura do clube
     */
    async getClubSubscription(clubId: string) {
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            select: {
                id: true,
                name: true,
                planTier: true,
                subscriptionStatus: true,
                memberLimit: true,
                nextBillingDate: true,
                gracePeriodDays: true,
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!club) {
            throw new NotFoundException('Clube não encontrado');
        }

        // Verificar se está no período de carência
        let isInGracePeriod = false;
        let daysUntilOverdue = 0;

        if (club.nextBillingDate) {
            const now = new Date();
            const billingDate = new Date(club.nextBillingDate);
            const gracePeriodEnd = new Date(billingDate);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (club.gracePeriodDays || 5));

            if (now > billingDate && now < gracePeriodEnd) {
                isInGracePeriod = true;
                daysUntilOverdue = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            }
        }

        return {
            ...club,
            currentMemberCount: club._count.users,
            isInGracePeriod,
            daysUntilOverdue
        };
    }

    // ============================================
    // CRON JOBS (para verificar vencimentos)
    // ============================================

    /**
     * Verificar e atualizar assinaturas expiradas
     * Deve ser chamado por um cron job diário
     */
    async checkExpiredSubscriptions() {
        const now = new Date();

        // Buscar clubes com vencimento passado que ainda estão ACTIVE
        const expiredClubs = await this.prisma.club.findMany({
            where: {
                subscriptionStatus: 'ACTIVE',
                nextBillingDate: { lt: now }
            }
        });

        let updatedCount = 0;

        for (const club of expiredClubs) {
            const gracePeriodEnd = new Date(club.nextBillingDate!);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (club.gracePeriodDays || 5));

            // Se passou do período de carência, marcar como OVERDUE
            if (now > gracePeriodEnd) {
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: { subscriptionStatus: 'OVERDUE' }
                });
                updatedCount++;
                this.logger.warn(`Club ${club.id} (${club.name}) marked as OVERDUE`);
            }
        }

        return { checked: expiredClubs.length, updated: updatedCount };
    }

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Calcular valor da assinatura
     */
    calculateAmount(memberCount: number, months: number): number {
        return memberCount * SUBSCRIPTION_CONFIG.PRICE_PER_MEMBER_MONTHLY * months;
    }

    /**
     * Gerar descrição do pagamento
     */
    generatePaymentDescription(memberCount: number, months: number): string {
        const planName = months === 1 ? 'Mensal' : months === 3 ? 'Trimestral' : months === 12 ? 'Anual' : `${months} meses`;
        return `Assinatura ${planName} - ${memberCount} Acessos`;
    }
}
