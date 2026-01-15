import { api } from './axios';

// Configurações de assinatura
export const SUBSCRIPTION_CONFIG = {
    PRICE_PER_MEMBER_MONTHLY: 2.00,
    WHATSAPP_NUMBER: '5591983292005',
    GRACE_PERIOD_DAYS: 5,
};

export interface CanAddMemberResult {
    canAdd: boolean;
    currentCount: number;
    memberLimit: number;
    reason?: string;
}

export interface ClubSubscription {
    id: string;
    name: string;
    planTier: string;
    subscriptionStatus: string;
    memberLimit: number;
    nextBillingDate: string | null;
    gracePeriodDays: number;
    currentMemberCount: number;
    isInGracePeriod: boolean;
    daysUntilOverdue: number;
}

/**
 * Verifica se pode adicionar membro ao clube
 */
export async function canAddMember(clubId: string): Promise<CanAddMemberResult> {
    try {
        const res = await api.get(`/subscriptions/can-add-member/${clubId}`);
        return res.data;
    } catch (error: any) {
        console.error('Error checking member limit:', error);
        return {
            canAdd: false,
            currentCount: 0,
            memberLimit: 0,
            reason: 'Erro ao verificar limite de membros'
        };
    }
}

/**
 * Obter status da assinatura do clube
 */
export async function getClubSubscription(clubId: string): Promise<ClubSubscription | null> {
    try {
        const res = await api.get(`/subscriptions/club/${clubId}`);
        return res.data;
    } catch (error: any) {
        console.error('Error fetching subscription:', error);
        return null;
    }
}

/**
 * Calcular valor da assinatura
 */
export function calculateSubscriptionAmount(memberCount: number, months: number): number {
    return memberCount * SUBSCRIPTION_CONFIG.PRICE_PER_MEMBER_MONTHLY * months;
}

/**
 * Formatar valor em BRL
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

/**
 * Gerar link de WhatsApp para renovação
 */
export function generateRenewalWhatsAppLink(
    clubName: string,
    memberCount: number,
    months: number
): string {
    const amount = calculateSubscriptionAmount(memberCount, months);
    const formattedAmount = formatCurrency(amount);
    const planName = months === 1 ? 'Mensal' : months === 3 ? 'Trimestral' : 'Anual';

    const message = encodeURIComponent(
        `Olá! Gostaria de renovar/ajustar minha assinatura do Cantinho DBV.

*Clube:* ${clubName}
*Plano:* ${planName}
*Membros:* ${memberCount}
*Valor:* ${formattedAmount}

Por favor, me envie os dados do PIX.`
    );

    return `https://wa.me/${SUBSCRIPTION_CONFIG.WHATSAPP_NUMBER}?text=${message}`;
}

/**
 * Gerar link de WhatsApp para upgrade (limite atingido)
 */
export function generateUpgradeWhatsAppLink(
    clubName: string,
    currentLimit: number,
    desiredLimit: number
): string {
    const additionalMembers = desiredLimit - currentLimit;
    const additionalCost = additionalMembers * SUBSCRIPTION_CONFIG.PRICE_PER_MEMBER_MONTHLY;
    const formattedCost = formatCurrency(additionalCost);

    const message = encodeURIComponent(
        `Olá! Atingi o limite de membros do meu clube e preciso fazer upgrade.

*Clube:* ${clubName}
*Limite Atual:* ${currentLimit} membros
*Limite Desejado:* ${desiredLimit} membros
*Custo Adicional:* ${formattedCost}/mês

Por favor, me ajude a fazer o upgrade.`
    );

    return `https://wa.me/${SUBSCRIPTION_CONFIG.WHATSAPP_NUMBER}?text=${message}`;
}

/**
 * Verificar se assinatura está próxima do vencimento
 */
export function isSubscriptionNearExpiry(nextBillingDate: string | null, warningDays: number = 7): boolean {
    if (!nextBillingDate) return false;

    const billing = new Date(nextBillingDate);
    const now = new Date();
    const daysUntil = Math.ceil((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntil <= warningDays && daysUntil > 0;
}

/**
 * Obter cor do status da assinatura
 */
export function getSubscriptionStatusColor(status: string): { bg: string; text: string; border: string } {
    switch (status) {
        case 'ACTIVE':
            return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
        case 'TRIAL':
            return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
        case 'OVERDUE':
            return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
        case 'CANCELED':
            return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
        default:
            return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    }
}

/**
 * Traduzir status da assinatura
 */
export function translateSubscriptionStatus(status: string): string {
    switch (status) {
        case 'ACTIVE':
            return 'Ativa';
        case 'TRIAL':
            return 'Período de Teste';
        case 'OVERDUE':
            return 'Em Atraso';
        case 'CANCELED':
            return 'Cancelada';
        default:
            return status;
    }
}
