import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService, SUBSCRIPTION_CONFIG } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    // ============================================
    // MEMBER LIMIT
    // ============================================

    /**
     * Verificar se pode adicionar membro ao clube
     */
    @Get('can-add-member/:clubId')
    async canAddMember(@Param('clubId') clubId: string) {
        return this.subscriptionsService.canAddMember(clubId);
    }

    /**
     * Obter status da assinatura do clube
     */
    @Get('club/:clubId')
    async getClubSubscription(@Param('clubId') clubId: string) {
        return this.subscriptionsService.getClubSubscription(clubId);
    }

    // ============================================
    // PAYMENTS
    // ============================================

    /**
     * Listar pagamentos de um clube
     */
    @Get('payments/club/:clubId')
    async getClubPayments(@Param('clubId') clubId: string) {
        return this.subscriptionsService.getClubPayments(clubId);
    }

    /**
     * Listar pagamentos pendentes (apenas MASTER)
     */
    @Get('payments/pending')
    async getPendingPayments(@Req() req) {
        // Verificar se é MASTER
        if (req.user.role !== 'MASTER') {
            throw new ForbiddenException('Apenas o Master pode ver pagamentos pendentes');
        }
        return this.subscriptionsService.getPendingPayments();
    }

    /**
     * Criar pagamento pendente para um clube
     */
    @Post('payments')
    async createPayment(
        @Body() body: {
            clubId: string;
            memberCount: number;
            months: number;
            type?: 'SUBSCRIPTION' | 'MEMBER_ADDITION' | 'RENEWAL';
        },
        @Req() req
    ) {
        // Apenas MASTER ou OWNER/ADMIN do clube
        if (req.user.role !== 'MASTER' && req.user.clubId !== body.clubId) {
            throw new ForbiddenException('Sem permissão para criar pagamento');
        }

        const amount = this.subscriptionsService.calculateAmount(body.memberCount, body.months);
        const description = this.subscriptionsService.generatePaymentDescription(body.memberCount, body.months);

        return this.subscriptionsService.createPendingPayment(
            body.clubId,
            amount,
            description,
            {
                memberCount: body.memberCount,
                months: body.months,
                billingCycle: body.months === 1 ? 'MENSAL' : body.months === 3 ? 'TRIMESTRAL' : 'ANUAL'
            },
            body.type as any || 'SUBSCRIPTION'
        );
    }

    /**
     * Confirmar pagamento (apenas MASTER - PIX recebido)
     */
    @Patch('payments/:id/confirm')
    async confirmPayment(@Param('id') id: string, @Req() req) {
        // Apenas MASTER pode confirmar
        if (req.user.role !== 'MASTER') {
            throw new ForbiddenException('Apenas o Master pode confirmar pagamentos');
        }
        return this.subscriptionsService.confirmPayment(id, req.user.sub);
    }

    /**
     * Estornar pagamento (apenas MASTER)
     */
    @Patch('payments/:id/refund')
    async refundPayment(@Param('id') id: string, @Req() req) {
        if (req.user.role !== 'MASTER') {
            throw new ForbiddenException('Apenas o Master pode estornar pagamentos');
        }
        return this.subscriptionsService.refundPayment(id);
    }

    /**
     * Deletar pagamento (apenas MASTER)
     */
    @Delete('payments/:id')
    async deletePayment(@Param('id') id: string, @Req() req) {
        if (req.user.role !== 'MASTER') {
            throw new ForbiddenException('Apenas o Master pode deletar pagamentos');
        }
        return this.subscriptionsService.deletePayment(id);
    }

    // ============================================
    // CONFIG
    // ============================================

    /**
     * Obter configurações públicas de assinatura
     */
    @Get('config')
    getConfig() {
        return {
            pricePerMemberMonthly: SUBSCRIPTION_CONFIG.PRICE_PER_MEMBER_MONTHLY,
            whatsappNumber: SUBSCRIPTION_CONFIG.WHATSAPP_NUMBER,
            warningDays: SUBSCRIPTION_CONFIG.WARNING_DAYS,
            gracePeriodDays: SUBSCRIPTION_CONFIG.GRACE_PERIOD_DAYS
        };
    }

    // ============================================
    // MAINTENANCE
    // ============================================

    /**
     * Verificar assinaturas expiradas (pode ser chamado por cron)
     */
    @Post('check-expired')
    async checkExpired(@Req() req) {
        if (req.user.role !== 'MASTER') {
            throw new ForbiddenException('Apenas o Master pode executar verificação');
        }
        return this.subscriptionsService.checkExpiredSubscriptions();
    }
}
