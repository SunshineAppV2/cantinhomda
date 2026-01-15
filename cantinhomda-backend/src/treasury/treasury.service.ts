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
        console.log('[TREASURY] create() - Recebido:', {
            type: data.type,
            points: data.points,
            isPaid: (data as any).isPaid
        });

        // Extract isPaid (not a DB field)
        const { isPaid, ...dbData } = data as any;

        // Smart Deduction: If payer is Parent and has 1 child, assign to child
        let memberId = dbData.memberId;
        if (!memberId && dbData.payerId) {
            const payer = await this.prisma.user.findUnique({
                where: { id: dbData.payerId },
                include: { children: true }
            });
            if (payer?.children.length === 1) {
                memberId = payer.children[0].id;
            }
        }

        // Create transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                ...dbData,
                memberId,
                status: (dbData.type === 'EXPENSE' || isPaid) ? 'COMPLETED' : 'PENDING',
                paymentMethod: 'DINHEIRO',
                date: isPaid ? new Date() : (dbData.date || new Date())
            }
        });

        console.log('[TREASURY] create() - Transação criada:', {
            id: transaction.id,
            status: transaction.status,
            type: transaction.type,
            points: transaction.points
        });

        // Award points if eligible
        if (transaction.type === 'INCOME' && transaction.status === 'COMPLETED' && transaction.points > 0) {
            await this.awardPoints(transaction);
        }

        return transaction;
    }

    async createBulk(data: any) {
        try {
            console.log('[TREASURY] createBulk() - Iniciado');

            // Handle direct array of transactions from frontend
            if (data.transactions && Array.isArray(data.transactions)) {
                console.log(`[TREASURY] createBulk() - Criando ${data.transactions.length} transações`);

                const operations = data.transactions.map(tx => {
                    const { id, isPaid, ...cleanTx } = tx;
                    return this.prisma.transaction.create({
                        data: {
                            ...cleanTx,
                            status: (cleanTx.type === 'EXPENSE' || isPaid) ? 'COMPLETED' : 'PENDING',
                            date: cleanTx.date ? new Date(cleanTx.date) : new Date(),
                            dueDate: cleanTx.dueDate ? new Date(cleanTx.dueDate) : undefined
                        }
                    });
                });

                const transactions = await this.prisma.$transaction(operations);
                console.log(`[TREASURY] createBulk() - ${transactions.length} transações criadas`);

                // Award points for eligible transactions
                for (const tx of transactions) {
                    if (tx.type === 'INCOME' && tx.status === 'COMPLETED' && tx.points > 0) {
                        await this.awardPoints(tx);
                    }
                }

                return transactions;
            }

            // Handle memberIds array (bulk creation for multiple members)
            const { memberIds, installments = 1, ...txData } = data;
            if (!memberIds || !Array.isArray(memberIds)) {
                throw new Error('Lista de membros não fornecida.');
            }

            const iterations = txData.recurrence ? (Number(installments) || 1) : 1;
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
                            paymentMethod: 'DINHEIRO',
                            date: data.isPaid ? new Date() : (txData.date || new Date())
                        }
                    }));
                }
            }

            const transactions = await this.prisma.$transaction(operations);
            console.log(`[TREASURY] createBulk() - ${transactions.length} transações criadas para membros`);

            // Award points for eligible transactions
            for (const tx of transactions) {
                if (tx.type === 'INCOME' && tx.status === 'COMPLETED' && tx.points > 0) {
                    await this.awardPoints(tx);
                }
            }

            return transactions;
        } catch (error) {
            console.error('[TREASURY] createBulk() - Erro:', error);
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
            console.error('[TREASURY] update() - Erro:', error);
            throw new HttpException(
                `Erro ao atualizar transação: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async remove(id: string) {
        try {
            const transaction = await this.prisma.transaction.findUnique({
                where: { id }
            });

            if (!transaction) {
                throw new HttpException('Transação não encontrada', HttpStatus.NOT_FOUND);
            }

            // Reverse points if eligible
            if (transaction.type === 'INCOME' && transaction.status === 'COMPLETED' && transaction.points > 0) {
                await this.reversePoints(transaction);
            }

            return await this.prisma.transaction.delete({ where: { id } });
        } catch (error) {
            console.error('[TREASURY] remove() - Erro:', error);
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

            if (a.status === 'PENDING') {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.date).getTime();
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.date).getTime();
                return dateA - dateB;
            }

            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });
    }

    async settle(id: string, data: SettleTransactionDto) {
        const paymentDate = new Date(data.paymentDate);

        const transaction = await this.prisma.transaction.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                date: paymentDate
            }
        });

        // Award points if eligible
        if (transaction.type === 'INCOME' && transaction.points > 0) {
            await this.awardPoints(transaction, paymentDate);
        }

        return transaction;
    }

    async approve(id: string) {
        const approvalDate = new Date();

        const transaction = await this.prisma.transaction.update({
            where: { id },
            data: { status: 'COMPLETED', date: approvalDate }
        });

        // Award points if eligible
        if (transaction.type === 'INCOME' && transaction.points > 0) {
            await this.awardPoints(transaction, approvalDate);
        }

        return transaction;
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
            where: { clubId, status: 'COMPLETED' }
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
     * Award points to user when payment is confirmed
     */
    private async awardPoints(transaction: any, effectiveDate: Date = new Date()) {
        try {
            console.log('[POINTS] Verificando elegibilidade:', {
                id: transaction.id,
                type: transaction.type,
                status: transaction.status,
                points: transaction.points
            });

            let pointsToAward = transaction.points;

            // Apply late penalty
            if (transaction.dueDate && effectiveDate > transaction.dueDate) {
                pointsToAward = Math.floor(pointsToAward * 0.5);
                console.log('[POINTS] Penalidade por atraso aplicada: 50%');
            }

            const beneficiaryId = transaction.memberId || transaction.payerId;
            if (!beneficiaryId) {
                console.log('[POINTS] ❌ Nenhum beneficiário encontrado');
                return;
            }

            // Update user points
            await this.prisma.user.update({
                where: { id: beneficiaryId },
                data: {
                    points: { increment: pointsToAward },
                    pointsHistory: {
                        create: {
                            amount: pointsToAward,
                            reason: `Pagamento: ${transaction.category}`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });

            console.log(`[POINTS] ✅ ${pointsToAward} pontos concedidos para ${beneficiaryId}`);

            // Notify user
            if (transaction.payerId) {
                await this.notificationsService.send(
                    transaction.payerId,
                    'Pontos Adicionados',
                    `Você ganhou ${pointsToAward} pontos por: ${transaction.category}`,
                    'SUCCESS'
                );
            }
        } catch (error) {
            console.error('[POINTS] ❌ Erro ao conceder pontos:', error);
        }
    }

    /**
     * Reverse points when transaction is deleted
     */
    private async reversePoints(transaction: any) {
        try {
            console.log('[POINTS] Revertendo pontos:', {
                id: transaction.id,
                points: transaction.points
            });

            let pointsToReverse = transaction.points;

            // Calculate penalty that was applied
            if (transaction.dueDate && transaction.date > transaction.dueDate) {
                pointsToReverse = Math.floor(pointsToReverse * 0.5);
            }

            const beneficiaryId = transaction.memberId || transaction.payerId;
            if (!beneficiaryId) {
                console.log('[POINTS] ❌ Nenhum beneficiário encontrado');
                return;
            }

            await this.prisma.user.update({
                where: { id: beneficiaryId },
                data: {
                    points: { decrement: pointsToReverse },
                    pointsHistory: {
                        create: {
                            amount: -pointsToReverse,
                            reason: `Estorno: ${transaction.category}`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });

            console.log(`[POINTS] ✅ ${pointsToReverse} pontos revertidos de ${beneficiaryId}`);

            // Notify user
            if (transaction.payerId) {
                await this.notificationsService.send(
                    transaction.payerId,
                    'Pontos Removidos',
                    `${pointsToReverse} pontos foram removidos devido à exclusão de: ${transaction.category}`,
                    'INFO'
                );
            }
        } catch (error) {
            console.error('[POINTS] ❌ Erro ao reverter pontos:', error);
        }
    }
}
