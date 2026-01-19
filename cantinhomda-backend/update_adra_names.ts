
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPECIALTY_UPDATES = [
    { oldName: 'Alívio da Fome', newName: 'AD-001 - Alívio da Fome' },
    { oldName: 'Avaliação da Comunidade', newName: 'AD-002 - Avaliação da Comunidade' },
    { oldName: 'Serviço Comunitário', newName: 'AD-003 - Serviço Comunitário' },
    { oldName: 'Resposta a Emergências e Desastres', newName: 'AD-004 - Resposta a Emergências e Desastres' },
    { oldName: 'Resposta a Emergências e Desastres - Avançado', newName: 'AD-005 - Resposta a Emergências e Desastres - Avançado' },
    { oldName: 'Alfabetização', newName: 'AD-006 - Alfabetização' },
    { oldName: 'Resolução de Conflitos', newName: 'AD-007 - Resolução de Conflitos' },
    { oldName: 'Reassentamento de Refugiados', newName: 'AD-008 - Reassentamento de Refugiados' },
    { oldName: 'Desenvolvimento Comunitário', newName: 'AD-009 - Desenvolvimento Comunitário' },
];

async function main() {
    console.log('🔄 Updating ADRA specialty names with codes...\n');

    for (const update of SPECIALTY_UPDATES) {
        const specialty = await prisma.specialty.findFirst({
            where: {
                name: update.oldName,
                area: 'ADRA'
            }
        });

        if (specialty) {
            await prisma.specialty.update({
                where: { id: specialty.id },
                data: { name: update.newName }
            });
            console.log(`✅ ${update.oldName} → ${update.newName}`);
        } else {
            console.log(`⚠️  Not found: ${update.oldName}`);
        }
    }

    console.log('\n✅ All ADRA specialty names updated!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
