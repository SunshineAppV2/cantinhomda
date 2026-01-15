import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SettleTransactionDto } from './dto/settle-transaction.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TreasuryService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(data: CreateTransactionDto) {
        let memberId = data.memberId;

        // Smart Deduction: If payer is Parent and has 1 child, assign to child
        if (!memberId && data.payerId) {
            const payer = await this.prisma.user.findUnique({
                where: { id: data.payerId },
                include: { children: true }
            });
            if (payer && payer.children.length === 1) {
                memberId = payer.children[0].id;
            }
        }

        const transaction = await this.prisma.transaction.create({
            data: {
                ...data,
                memberId,
                status: (data.type === 'EXPENSE' || data.isPaid) ? 'COMPLETED' : 'PENDING',
                paymentMethod: data.isPaid ? 'DINHEIRO' : 'DINHEIRO', // Default
                date: data.isPaid ? new Date() : (data.date || new Date())
            }
        });

        // Award points if income and paid immediately
        if (transaction.status === 'COMPLETED' && transaction.type === 'INCOME') {
            await this.handlePointAwarding(transaction.id);
        }

        return transaction;
    }

    async createBulk(data: any) {
        try {
            // Handle direct array of transactions from frontend
            if (data.transactions && Array.isArray(data.transactions)) {
                console.log(`[TreasuryService] Creating ${data.transactions.length} transactions from array`);
                const operations = data.transactions.map(tx => {
                    const { id, ...cleanTx } = tx; // Remove any temporary ID
                    return this.prisma.transaction.create({
                        data: {
                            ...cleanTx,
                            status: tx.status || ((tx.type === 'EXPENSE' || tx.isPaid) ? 'COMPLETED' : 'PENDING'),
                            date: tx.date ? new Date(tx.date) : new Date(),
                            dueDate: tx.dueDate ? new Date(tx.dueDate) : undefined
                        }
                    });
                });
                const transactions = await this.prisma.$transaction(operations);

                // Award points for all completed Income transactions
                for (const tx of transactions) {
                    if (tx.status === 'COMPLETED' && tx.type === 'INCOME') {
                        await this.handlePointAwarding(tx.id);
                    }
                }

                return transactions;
            }

            const { memberIds, installments = 1, ...txData } = data;
            if (!memberIds || !Array.isArray(memberIds)) {
                throw new Error('Lista de membros ou transações não fornecida corretamente.');
            }

            const iterations = txData.recurrence ? (Number(installments) || 1) : 1;

            // Fetch users
            const users = await this.prisma.user.findMany({
                where: { id: { in: memberIds } },
                select: { id: true, name: true, parentId: true }
            });

            const operations: any[] = [];

            for (let i = 0; i < iterations; i++) {
                const currentDueDate = txData.dueDate ? new Date(txData.dueDate) : undefined;
                if (currentDueDate) {
                    currentDueDate.setMonth(currentDueDate.getMonth() + i);
                }

                for (const user of users) {
                    const payerId = user.parentId || user.id;
                    let description = `${txData.description} - ${user.name}`;
                    if (iterations > 1) {
                        description += ` (${i + 1}/${iterations})`;
                    }

                    operations.push(this.prisma.transaction.create({
                        data: {
                            ...txData,
                            description,
                            payerId,
                            memberId: user.id,
                            status: (txData.type === 'EXPENSE' || data.isPaid) ? 'COMPLETED' : 'PENDING',
                            dueDate: currentDueDate,
                            paymentMethod: data.isPaid ? 'DINHEIRO' : 'DINHEIRO',
                            date: data.isPaid ? new Date() : (txData.date || new Date())
                        },
                        include: {
                            payer: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }));
                }
            }

            const transactions = await this.prisma.$transaction(operations);

            // Award points for all completed Income transactions
            for (const tx of transactions) {
                if (tx.status === 'COMPLETED' && tx.type === 'INCOME') {
                    await this.handlePointAwarding(tx.id);
                }
            }

            return transactions;
        } catch (error) {
            console.error('Error in createBulk:', error);
            throw new HttpException(
                `Erro ao criar transações: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async update(id: string, data: UpdateTransactionDto) {
        try {
            const { id: _id, clubId, ...updateData } = data as any;

            return await this.prisma.transaction.update({
                where: { id },
                data: updateData
            });
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw new HttpException(
                `Erro ao atualizar transação: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async remove(id: string) {
        try {
            // 1. Fetch transaction before deletion to reverse points if needed
            const transaction = await this.prisma.transaction.findUnique({
                where: { id },
                include: { payer: true }
            });

            if (!transaction) {
                throw new HttpException('Transação não encontrada', HttpStatus.NOT_FOUND);
            }

            // 2. Reverse points if this was a completed income transaction
            await this.handlePointReversal(transaction);

            // 3. Delete the transaction
            return await this.prisma.transaction.delete({
                where: { id }
            });
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw new HttpException(
                `Erro ao excluir transação: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async findAll(clubId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId },
            include: { payer: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' }
        });

        // Custom Sort: WAITING > PENDING > COMPLETED > CANCELED
        const statusPriority = {
            'WAITING_APPROVAL': 0,
            'PENDING': 1,
            'COMPLETED': 2,
            'CANCELED': 3
        };

        return transactions.sort((a, b) => {
            const priorityA = statusPriority[a.status] ?? 99;
            const priorityB = statusPriority[b.status] ?? 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If PENDING, Sort by Due Date ASC (Vencidos/Antigos primeiro)
            if (a.status === 'PENDING') {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.date).getTime();
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.date).getTime();
                return dateA - dateB; // ASC
            }

            // For COMPLETED/CANCELED/WAITING, keep Date DESC (Mais recentes primeiro)
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // DESC
        });
    }

    async settle(id: string, data: SettleTransactionDto) {
        const paymentDate = new Date(data.paymentDate);

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                date: paymentDate
            }
        });

        await this.handlePointAwarding(id, paymentDate);

        return updated;
    }

    async approve(id: string) {
        const approvalDate = new Date();

        // 1. Update Status
        const updated = await this.prisma.transaction.update({
            where: { id },
            data: { status: 'COMPLETED', date: approvalDate }
        });

        // 2. Award Points and Notify
        await this.handlePointAwarding(id, approvalDate);

        return updated;
    }

    async pay(id: string, proofUrl?: string) {
        return this.prisma.transaction.update({
            where: { id },
            data: {
                status: 'WAITING_APPROVAL',
                proofUrl
            }
        });
    }

    async findForUser(userId: string) {
        return this.prisma.transaction.findMany({
            where: { payerId: userId },
            orderBy: { date: 'desc' }
        });
    }

    async reject(id: string) {
        return this.prisma.transaction.update({
            where: { id },
            data: { status: 'CANCELED' }
        });
    }

    async getBalance(clubId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId, status: 'COMPLETED' } // Only count COMPLETED
        });

        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            balance: income - expense,
            income,
            expense
        };
    }

    /**
     * Centralized logic to award points and notify user when a transaction is PAID
     */
    private async handlePointAwarding(transactionId: string, effectiveDate: Date = new Date()) {
        try {
            console.log(`[RANKING] handlePointAwarding called for transaction: ${transactionId}`);

            const tx = await this.prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { payer: true }
            });

            console.log(`[RANKING] Transaction found:`, {
                id: tx?.id,
                status: tx?.status,
                type: tx?.type,
                points: tx?.points,
                category: tx?.category
            });

            if (!tx || tx.status !== 'COMPLETED' || tx.type !== 'INCOME') {
                console.log(`[RANKING] Skipping - conditions not met`);
                return;
            }

            let pointsToAward = tx.points || 0;
            let isLate = false;

            // Apply Penalty if late (payment/approval after due date)
            if (tx.dueDate && effectiveDate > tx.dueDate) {
                pointsToAward = Math.floor(pointsToAward * 0.5);
                isLate = true;
                console.log(`[RANKING] Late payment - points reduced to 50%: ${pointsToAward}`);
            }

            if (pointsToAward <= 0) {
                console.log(`[RANKING] No points to award (points: ${pointsToAward})`);
                return;
            }

            const beneficiaryId = tx.memberId || tx.payerId;
            console.log(`[RANKING] Beneficiary ID: ${beneficiaryId}, Points to award: ${pointsToAward}`);

            if (beneficiaryId) {
                // 1. Award Points to User
                await this.prisma.user.update({
                    where: { id: beneficiaryId },
                    data: {
                        points: { increment: pointsToAward },
                        pointsHistory: {
                            create: {
                                amount: pointsToAward,
                                reason: `Pagamento: ${tx.category}`,
                                source: 'PURCHASE'
                            }
                        }
                    }
                });

                console.log(`[RANKING] ✅ Points awarded successfully: +${pointsToAward} points`);

                // 2. Notify Payer
                if (tx.payerId) {
                    const message = isLate
                        ? `Pagamento de ${tx.category} confirmado com atraso. Você recebeu ${pointsToAward} pontos (50% do total).`
                        : `Seu pagamento de ${tx.category} foi confirmado! Você recebeu ${pointsToAward} pontos.`;

                    await this.notificationsService.send(
                        tx.payerId,
                        'Ranking Atualizado',
                        message,
                        'SUCCESS'
                    );
                }
            }
        } catch (error) {
            console.error(`[RANKING] ❌ Error awarding points for tx ${transactionId}:`, error);
        }
    }

    /**
     * Reverse points when a transaction is deleted
     */
    private async handlePointReversal(transaction: any) {
        try {
            console.log(`[RANKING] handlePointReversal called for transaction:`, {
                id: transaction.id,
                status: transaction.status,
                type: transaction.type,
                points: transaction.points
            });

            // Only reverse points for completed income transactions
            if (transaction.status !== 'COMPLETED' || transaction.type !== 'INCOME') {
                console.log(`[RANKING] Skipping reversal - conditions not met`);
                return;
            }

            const pointsAwarded = transaction.points || 0;
            if (pointsAwarded <= 0) {
                console.log(`[RANKING] No points to reverse (points: ${pointsAwarded})`);
                return;
            }

            const beneficiaryId = transaction.memberId || transaction.payerId;
            if (!beneficiaryId) {
                console.log(`[RANKING] No beneficiary found`);
                return;
            }

            // Calculate the actual points that were awarded (considering late penalty)
            let actualPoints = pointsAwarded;
            if (transaction.dueDate && transaction.date > transaction.dueDate) {
                actualPoints = Math.floor(pointsAwarded * 0.5);
                console.log(`[RANKING] Late payment detected - reversing 50%: ${actualPoints}`);
            }

            console.log(`[RANKING] Reversing ${actualPoints} points from user ${beneficiaryId}`);

            // Subtract points from user
            await this.prisma.user.update({
                where: { id: beneficiaryId },
                data: {
                    points: { decrement: actualPoints },
                    pointsHistory: {
                        create: {
                            amount: -actualPoints,
                            reason: `Estorno: ${transaction.category} (transação excluída)`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });

            console.log(`[RANKING] ✅ Points reversed successfully: -${actualPoints} points`);

            // Notify user about point reversal
            if (transaction.payerId) {
                await this.notificationsService.send(
                    transaction.payerId,
                    'Pontos Estornados',
                    `A transação "${transaction.category}" foi excluída. ${actualPoints} pontos foram removidos do seu ranking.`,
                    'INFO'
                );
            }
        } catch (error) {
            console.error(`[RANKING] ❌ Error reversing points for deleted transaction:`, error);
        }
    }
}
// Force reload
