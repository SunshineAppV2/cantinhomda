import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Request, Req, ForbiddenException } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubApprovalService } from './club-approval.service';
import { ClubPaymentService } from './club-payment.service';
import { CreateClubDto } from './dto/create-club.dto';
import { BulkUpdateBillingDateDto } from './dto/bulk-update-subscription.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clubs')
export class ClubsController {
    constructor(
        private readonly clubsService: ClubsService,
        private readonly clubApprovalService: ClubApprovalService,
        private readonly clubPaymentService: ClubPaymentService
    ) { }

    @Post()
    create(@Body() createClubDto: CreateClubDto) {
        return this.clubsService.create(createClubDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assign-owner')
    createAndAssignOwner(@Body() body: { createClubDto: CreateClubDto, ownerId: string }, @Request() req) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhomda.com') {
            throw new Error('Acesso negado');
        }
        return this.clubsService.createAndAssignOwner(body.createClubDto, body.ownerId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('export/all')
    exportData(@Req() req) {
        // Only allow if user is OWNER or specific role if needed.
        // For now, any authenticated user can export THEIR club data.
        return this.clubsService.getExportData(req.user.clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('status')
    getClubStatus(@Req() req) {
        return this.clubsService.getClubStatus(req.user.clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard-stats')
    async getDashboardStats(@Request() req) {
        return this.clubsService.getDashboardStats(req.user.clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    getDashboard(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        const isCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(req.user.role);

        if (!isMaster && !isCoordinator) throw new Error('Acesso negado');

        return this.clubsService.getAllClubsDetailed(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/referrals')
    getReferralReport(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado');
        return this.clubsService.getReferralReport();
    }

    // ============================================
    // ENDPOINTS DE APROVAÇÃO DE CLUBES
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Post(':id/approve')
    async approveClub(
        @Param('id') id: string,
        @Body() body: {
            grantTrial?: boolean;
            trialDays?: number;
            subscriptionPlan?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
            notes?: string;
        },
        @Request() req
    ) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado. Apenas Master pode aprovar clubes.');

        return this.clubApprovalService.approveClub(id, req.user.id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/reject')
    async rejectClub(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @Request() req
    ) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado. Apenas Master pode rejeitar clubes.');

        return this.clubApprovalService.rejectClub(id, req.user.id, body.reason);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/grant-trial')
    async grantTrial(
        @Param('id') id: string,
        @Body() body: { trialDays: number },
        @Request() req
    ) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado. Apenas Master pode conceder período de teste.');

        return this.clubApprovalService.grantTrial(id, req.user.id, body.trialDays);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/status')
    async changeClubStatus(
        @Param('id') id: string,
        @Body() body: { status: string; reason?: string },
        @Request() req
    ) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado. Apenas Master pode alterar status de clubes.');

        return this.clubApprovalService.changeStatus(id, body.status as any, req.user.id, body.reason);
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/pending')
    async getPendingClubs(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado.');

        return this.clubApprovalService.getPendingClubs();
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/approval-metrics')
    async getApprovalMetrics(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado.');

        return this.clubApprovalService.getApprovalMetrics();
    }

    // ============================================
    // ENDPOINTS DE PAGAMENTO
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Post('admin/check-payments')
    async checkPayments(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado.');

        return this.clubPaymentService.checkPaymentStatus();
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/payment-status')
    async getPaymentStatus(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado.');

        return this.clubPaymentService.getPaymentStatus();
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/reactivate')
    async reactivateClub(
        @Param('id') id: string,
        @Body() body: { subscriptionPlan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' },
        @Request() req
    ) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new Error('Acesso negado.');

        return this.clubPaymentService.reactivateClub(id, {
            subscriptionPlan: body.subscriptionPlan,
            paidBy: req.user.id
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req) {
        return this.clubsService.findAll(req.user);
    }

    @Get('hierarchy-options')
    getHierarchyOptions() {
        return this.clubsService.getHierarchyOptions();
    }

    @Get('regions')
    async getRegions(@Query('association') association: string) {
        return this.clubsService.getRegions(association);
    }

    @Get('districts')
    async getDistricts(@Query('region') region: string) {
        return this.clubsService.getDistricts(region);
    }

    @Get('public')
    findAllPublic() {
        return this.clubsService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('hierarchy-tree')
    getHierarchyTree() {
        return this.clubsService.getHierarchyTree();
    }

    @UseGuards(JwtAuthGuard)
    @Patch('hierarchy/rename')
    async renameHierarchyNode(@Body() body: { level: 'union' | 'mission' | 'region', oldName: string, newName: string }, @Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new ForbiddenException('Acesso negado'); // Use proper exception
        try {
            return await this.clubsService.renameHierarchyNode(body.level, body.oldName, body.newName);
        } catch (error) {
            console.error('Error renaming hierarchy node:', error);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete('hierarchy')
    async deleteHierarchyNode(@Query('level') level: 'union' | 'mission' | 'region', @Query('name') name: string, @Request() req) {
        const isMaster = req.user.email === 'master@cantinhomda.com' || req.user.role === 'MASTER';
        if (!isMaster) throw new ForbiddenException('Acesso negado');
        try {
            return await this.clubsService.deleteHierarchyNode(level, name);
        } catch (error) {
            console.error('Error deleting hierarchy node:', error);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch('bulk-update-billing-date')
    async bulkUpdateBillingDate(@Body() dto: BulkUpdateBillingDateDto, @Request() req) {
        if (req.user.email !== 'master@cantinhomda.com' && req.user.role !== 'MASTER') {
            throw new Error('Acesso negado. Apenas o Master pode atualizar datas em massa.');
        }
        return this.clubsService.bulkUpdateBillingDate(
            dto.clubIds,
            dto.nextBillingDate,
            dto.gracePeriodDays,
            {
                subscriptionPlan: dto.subscriptionPlan,
                memberLimit: dto.memberLimit,
                status: dto.status
            }
        );
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/subscription')
    async updateSubscription(@Param('id') id: string, @Body() body: any, @Request() req) {
        console.log('Update Subscription Request:', { id, body, user: req.user.email });
        if (req.user.email !== 'master@cantinhomda.com' && req.user.role !== 'MASTER') throw new Error('Acesso negado. Apenas o Master pode gerenciar assinaturas.');
        try {
            return await this.clubsService.updateSubscription(id, body);
        } catch (e) {
            console.error('Error updating subscription:', e);
            throw e;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/send-payment-info')
    async sendPaymentInfo(@Param('id') id: string, @Body() body: { message?: string }, @Request() req) {
        if (req.user.email !== 'master@cantinhomda.com' && req.user.role !== 'MASTER') {
            throw new Error('Acesso negado.');
        }
        return this.clubsService.sendPaymentInfo(id, body.message);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clubsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; logoUrl?: string; settings?: any; union?: string; mission?: string; region?: string; district?: string; association?: string; participatesInRanking?: boolean }) {
        return this.clubsService.update(id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.clubsService.delete(id);
    }
}
