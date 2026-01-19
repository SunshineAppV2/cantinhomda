import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const specialty = await prisma.specialty.findFirst();
        console.log('Campos da tabela Specialty:', specialty ? Object.keys(specialty) : 'Nenhuma especialidade encontrada');
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
