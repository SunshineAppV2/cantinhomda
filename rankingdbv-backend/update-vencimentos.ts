import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Datas no formato YYYY-MM-DD
    const oldDateStr = '2025-01-05';
    const newDateStr = '2025-01-11';

    console.log(`🚀 Iniciando atualização em massa...`);
    console.log(`De: ${oldDateStr} Para: ${newDateStr}`);

    // Definindo o intervalo do dia (UTC) para encontrar as transações
    const dayStart = new Date(`${oldDateStr}T00:00:00Z`);
    const dayEnd = new Date(`${oldDateStr}T23:59:59.999Z`);
    const targetDate = new Date(`${newDateStr}T12:00:00Z`); // Usando meio-dia para evitar problemas de fuso

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                dueDate: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            include: {
                club: { select: { name: true } }
            }
        });

        console.log(`🔍 Encontradas ${transactions.length} transações.`);

        if (transactions.length === 0) {
            console.log('⚠️ Nenhuma transação encontrada com vencimento em ' + oldDateStr);
            return;
        }

        // Listar algumas para conferência
        console.log('📝 Amostra das transações encontradas:');
        transactions.slice(0, 5).forEach(t => {
            console.log(`- ID: ${t.id} | Descrição: ${t.description} | Clube: ${t.club.name}`);
        });

        const confirm = await prisma.transaction.updateMany({
            where: {
                dueDate: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            data: {
                dueDate: targetDate,
            },
        });

        console.log(`✅ SUCESSO! ${confirm.count} transações foram atualizadas para ${newDateStr}.`);
    } catch (error) {
        console.error('❌ Erro ao executar a atualização:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
