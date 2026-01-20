import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClubStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubPaymentService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    /**
     * Verificar status de pagamento de todos os clubes
     * Executado periodicamente (job a cada 6 horas)
     */
    async checkPaymentStatus() {
        const now = new Date();

        // 1. Verificar clubes que precisam receber aviso de 72h
        await this.sendWarning72h(now);

        // 2. Verificar clubes que precisam receber aviso de 48h
        await this.sendWarning48h(now);

        // 3. Verificar clubes que precisam receber aviso de 24h
        await this.sendWarning24h(now);

        // 4. Suspender clubes vencidos (bloqueio imediato)
        await this.suspendOverdueClubs(now);

        // 5. Verificar fim de período de teste
        await this.handleTrialEnding(now);

        return {
            timestamp: now,
            message: 'Verificação de pagamentos concluída'
        };
    }

    /**
     * Enviar aviso de 72 horas antes do vencimento
     */
    private async sendWarning72h(now: Date) {
        const targetDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        const rangeStart = new Date(targetDate.getTime() - 30 * 60 * 1000); // -30min
        const rangeEnd = new Date(targetDate.getTime() + 30 * 60 * 1000);   // +30min

        const clubs = await this.prisma.club.findMany({
            where: {
                status: { in: [ClubStatus.ACTIVE, ClubStatus.PAYMENT_WARNING] },
                nextPaymentDue: { gte: rangeStart, lte: rangeEnd },
                warning72hSent: false
            },
            include: {
                users: {
                    where: { role: 'OWNER' },
                    select: { id: true, name: true, email: true }
                }
            }
        });

        for (const club of clubs) {
            try {
                // Enviar email de aviso
                await this.sendPaymentWarningEmail(club, 72);

                // Marcar como enviado
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: {
                        status: ClubStatus.PAYMENT_WARNING,
                        warning72hSent: true,
                        warning72hSentAt: now
                    }
                });

                console.log(`✅ Aviso 72h enviado para clube: ${club.name}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar aviso 72h para ${club.name}:`, error);
            }
        }

        return clubs.length;
    }

    /**
     * Enviar aviso de 48 horas antes do vencimento
     */
    private async sendWarning48h(now: Date) {
        const targetDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const rangeStart = new Date(targetDate.getTime() - 30 * 60 * 1000);
        const rangeEnd = new Date(targetDate.getTime() + 30 * 60 * 1000);

        const clubs = await this.prisma.club.findMany({
            where: {
                status: ClubStatus.PAYMENT_WARNING,
                nextPaymentDue: { gte: rangeStart, lte: rangeEnd },
                warning48hSent: false
            },
            include: {
                users: {
                    where: { role: 'OWNER' },
                    select: { id: true, name: true, email: true }
                }
            }
        });

        for (const club of clubs) {
            try {
                await this.sendPaymentWarningEmail(club, 48);

                await this.prisma.club.update({
                    where: { id: club.id },
                    data: {
                        warning48hSent: true,
                        warning48hSentAt: now
                    }
                });

                console.log(`✅ Aviso 48h enviado para clube: ${club.name}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar aviso 48h para ${club.name}:`, error);
            }
        }

        return clubs.length;
    }

    /**
     * Enviar aviso de 24 horas antes do vencimento (CRÍTICO)
     */
    private async sendWarning24h(now: Date) {
        const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const rangeStart = new Date(targetDate.getTime() - 30 * 60 * 1000);
        const rangeEnd = new Date(targetDate.getTime() + 30 * 60 * 1000);

        const clubs = await this.prisma.club.findMany({
            where: {
                status: ClubStatus.PAYMENT_WARNING,
                nextPaymentDue: { gte: rangeStart, lte: rangeEnd },
                warning24hSent: false
            },
            include: {
                users: {
                    where: { role: 'OWNER' },
                    select: { id: true, name: true, email: true }
                }
            }
        });

        for (const club of clubs) {
            try {
                await this.sendPaymentWarningEmail(club, 24);

                await this.prisma.club.update({
                    where: { id: club.id },
                    data: {
                        warning24hSent: true,
                        warning24hSentAt: now
                    }
                });

                console.log(`⚠️ Aviso CRÍTICO 24h enviado para clube: ${club.name}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar aviso 24h para ${club.name}:`, error);
            }
        }

        return clubs.length;
    }

    /**
     * Suspender clubes vencidos (bloqueio imediato no vencimento)
     */
    private async suspendOverdueClubs(now: Date) {
        const clubs = await this.prisma.club.findMany({
            where: {
                status: { in: [ClubStatus.ACTIVE, ClubStatus.PAYMENT_WARNING] },
                nextPaymentDue: { lte: now }
            },
            include: {
                users: {
                    where: { role: 'OWNER' },
                    select: { id: true, name: true, email: true }
                }
            }
        });

        for (const club of clubs) {
            try {
                // Suspender clube
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: { status: ClubStatus.SUSPENDED }
                });

                // Registrar no histórico
                await this.prisma.clubStatusHistory.create({
                    data: {
                        clubId: club.id,
                        fromStatus: club.status,
                        toStatus: ClubStatus.SUSPENDED,
                        changedBy: 'SYSTEM',
                        reason: 'Pagamento vencido - suspensão automática'
                    }
                });

                // Enviar email de suspensão
                await this.sendSuspensionEmail(club);

                console.log(`🚫 Clube SUSPENSO: ${club.name}`);
            } catch (error) {
                console.error(`❌ Erro ao suspender clube ${club.name}:`, error);
            }
        }

        return clubs.length;
    }

    /**
     * Verificar fim de período de teste
     */
    private async handleTrialEnding(now: Date) {
        const clubs = await this.prisma.club.findMany({
            where: {
                status: ClubStatus.TRIAL,
                trialEndsAt: { lte: now }
            }
        });

        for (const club of clubs) {
            try {
                // Mudar para PAYMENT_WARNING
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: {
                        status: ClubStatus.PAYMENT_WARNING,
                        nextPaymentDue: now // Vencimento imediato
                    }
                });

                console.log(`⏰ Período de teste finalizado: ${club.name}`);
            } catch (error) {
                console.error(`❌ Erro ao finalizar teste de ${club.name}:`, error);
            }
        }

        return clubs.length;
    }

    /**
     * Reativar clube após pagamento
     */
    async reactivateClub(clubId: string, paymentData: {
        subscriptionPlan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
        paidBy: string;
    }) {
        const club = await this.prisma.club.findUnique({ where: { id: clubId } });
        if (!club) throw new Error('Clube não encontrado');

        const now = new Date();
        const nextPaymentDue = this.calculateNextPaymentDate(now, paymentData.subscriptionPlan);

        const updated = await this.prisma.club.update({
            where: { id: clubId },
            data: {
                status: ClubStatus.ACTIVE,
                lastPaymentDate: now,
                nextPaymentDue,
                subscriptionPlan: paymentData.subscriptionPlan,
                // Resetar avisos
                warning72hSent: false,
                warning48hSent: false,
                warning24hSent: false,
                warning72hSentAt: null,
                warning48hSentAt: null,
                warning24hSentAt: null
            }
        });

        // Registrar histórico
        await this.prisma.clubStatusHistory.create({
            data: {
                clubId,
                fromStatus: club.status,
                toStatus: ClubStatus.ACTIVE,
                changedBy: paymentData.paidBy,
                reason: 'Pagamento confirmado - clube reativado'
            }
        });

        return updated;
    }

    /**
     * Obter status de pagamento de todos os clubes (para dashboard Master)
     */
    async getPaymentStatus() {
        const clubs = await this.prisma.club.findMany({
            where: {
                status: { not: ClubStatus.PENDING_APPROVAL }
            },
            select: {
                id: true,
                name: true,
                status: true,
                subscriptionPlan: true,
                nextPaymentDue: true,
                lastPaymentDate: true,
                warning72hSent: true,
                warning48hSent: true,
                warning24hSent: true,
                users: {
                    where: { role: 'OWNER' },
                    select: { name: true, email: true, phone: true }
                },
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { nextPaymentDue: 'asc' }
        });

        return clubs;
    }

    /**
     * Calcular próxima data de pagamento
     */
    private calculateNextPaymentDate(from: Date, plan: string): Date {
        const date = new Date(from);

        switch (plan) {
            case 'MONTHLY':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'QUARTERLY':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'ANNUAL':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }

        return date;
    }

    /**
     * Enviar email de aviso de pagamento
     */
    private async sendPaymentWarningEmail(club: any, hoursRemaining: number) {
        const owner = club.users[0];
        if (!owner) return;

        const urgencyLevel = hoursRemaining === 24 ? 'CRÍTICO' : 'IMPORTANTE';
        const subject = `${urgencyLevel}: Pagamento vence em ${hoursRemaining} horas - ${club.name}`;

        const message = `
Olá ${owner.name},

${hoursRemaining === 24 ? '⚠️ ATENÇÃO URGENTE!' : '⚠️ Lembrete de Pagamento'}

Seu pagamento vence em ${hoursRemaining} horas:
📅 Vencimento: ${club.nextPaymentDue?.toLocaleDateString('pt-BR')}
💰 Plano: ${club.subscriptionPlan}

${hoursRemaining === 24 ? '🚫 O acesso será BLOQUEADO AUTOMATICAMENTE no vencimento.' : ''}

Para evitar a suspensão do acesso, realize o pagamento o quanto antes.

Instruções de pagamento: [Link/Instruções]

Atenciosamente,
Equipe CantinhoMDA
        `.trim();

        // Aqui você integraria com seu serviço de email
        console.log(`📧 Email enviado para ${owner.email}:`, subject);

        // TODO: Integrar com NotificationsService para enviar email real
    }

    /**
     * Enviar email de suspensão
     */
    private async sendSuspensionEmail(club: any) {
        const owner = club.users[0];
        if (!owner) return;

        const subject = `🚫 Clube Suspenso - Pagamento Vencido - ${club.name}`;

        const message = `
Olá ${owner.name},

Seu clube foi suspenso devido ao não pagamento.

📅 Vencimento: ${club.nextPaymentDue?.toLocaleDateString('pt-BR')}
🚫 Status: SUSPENSO

Para reativar o acesso, realize o pagamento e entre em contato conosco.

Instruções: [Link/Contato]

Atenciosamente,
Equipe CantinhoMDA
        `.trim();

        console.log(`📧 Email de suspensão enviado para ${owner.email}`);

        // TODO: Integrar com NotificationsService
    }
}
