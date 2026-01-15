import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRankingPoints() {
    console.log('=== TESTE DE PONTUAÇÃO NO RANKING ===\n');

    try {
        // 1. Buscar um usuário de teste
        const user = await prisma.user.findFirst({
            where: { role: 'PATHFINDER' },
            select: { id: true, name: true, points: true, clubId: true }
        });

        if (!user || !user.clubId) {
            console.log('❌ Nenhum usuário PATHFINDER encontrado com clube');
            return;
        }

        console.log(`✅ Usuário encontrado: ${user.name}`);
        console.log(`   Pontos atuais: ${user.points}\n`);

        // 2. Criar uma transação de teste com pontos
        console.log('📝 Criando transação de teste...');
        const transaction = await prisma.transaction.create({
            data: {
                type: 'INCOME',
                amount: 50.00,
                description: 'TESTE - Mensalidade Janeiro',
                category: 'Mensalidade',
                status: 'COMPLETED',
                points: 100, // IMPORTANTE: Definir pontos
                clubId: user.clubId,
                memberId: user.id,
                payerId: user.id,
                date: new Date()
            }
        });

        console.log(`✅ Transação criada: ${transaction.id}`);
        console.log(`   Pontos configurados: ${transaction.points}\n`);

        // 3. Verificar se os pontos foram somados
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

        const userAfterCreate = await prisma.user.findUnique({
            where: { id: user.id },
            select: { points: true }
        });

        console.log('📊 Resultado após criação:');
        console.log(`   Pontos antes: ${user.points}`);
        console.log(`   Pontos depois: ${userAfterCreate?.points}`);
        console.log(`   Diferença: ${(userAfterCreate?.points || 0) - user.points}\n`);

        if ((userAfterCreate?.points || 0) > user.points) {
            console.log('✅ PONTOS SOMADOS COM SUCESSO!\n');
        } else {
            console.log('❌ PONTOS NÃO FORAM SOMADOS!\n');
        }

        // 4. Verificar histórico de pontos
        const pointHistory = await prisma.pointHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (pointHistory.length > 0) {
            console.log('📜 Último registro no histórico:');
            console.log(`   Quantidade: ${pointHistory[0].amount}`);
            console.log(`   Razão: ${pointHistory[0].reason}\n`);
        } else {
            console.log('❌ Nenhum registro encontrado no histórico de pontos\n');
        }

        // 5. Testar exclusão
        console.log('🗑️  Testando exclusão da transação...');
        await prisma.transaction.delete({
            where: { id: transaction.id }
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo

        const userAfterDelete = await prisma.user.findUnique({
            where: { id: user.id },
            select: { points: true }
        });

        console.log('📊 Resultado após exclusão:');
        console.log(`   Pontos antes da exclusão: ${userAfterCreate?.points}`);
        console.log(`   Pontos depois da exclusão: ${userAfterDelete?.points}`);
        console.log(`   Diferença: ${(userAfterDelete?.points || 0) - (userAfterCreate?.points || 0)}\n`);

        if ((userAfterDelete?.points || 0) < (userAfterCreate?.points || 0)) {
            console.log('✅ PONTOS REVERTIDOS COM SUCESSO!\n');
        } else {
            console.log('❌ PONTOS NÃO FORAM REVERTIDOS!\n');
        }

        // 6. Verificar histórico de estorno
        const reversalHistory = await prisma.pointHistory.findMany({
            where: {
                userId: user.id,
                amount: { lt: 0 }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (reversalHistory.length > 0) {
            console.log('📜 Registro de estorno no histórico:');
            console.log(`   Quantidade: ${reversalHistory[0].amount}`);
            console.log(`   Razão: ${reversalHistory[0].reason}\n`);
        } else {
            console.log('❌ Nenhum registro de estorno encontrado no histórico\n');
        }

    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testRankingPoints();
