
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLASSES = ['COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

async function main() {
    console.log('🧹 Cleaning up duplicate requirements for all classes...\n');

    let grandTotal = 0;

    for (const className of CLASSES) {
        console.log(`\n━━━ ${className} ━━━`);

        const requirements = await prisma.requirement.findMany({
            where: {
                dbvClass: className as any,
                clubId: null
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log(`Found ${requirements.length} requirements`);

        const descMap = new Map<string, any[]>();

        for (const req of requirements) {
            const key = req.description.substring(0, 50).trim();
            if (!descMap.has(key)) {
                descMap.set(key, []);
            }
            descMap.get(key)!.push(req);
        }

        let classDeleted = 0;

        for (const [desc, reqs] of descMap.entries()) {
            if (reqs.length > 1) {
                const withRomanCode = reqs.find(r => r.code && /^[IVX]+\./.test(r.code));
                const toKeep = withRomanCode || reqs[0];

                for (const req of reqs) {
                    if (req.id !== toKeep.id) {
                        await prisma.requirement.delete({
                            where: { id: req.id }
                        });
                        classDeleted++;
                    }
                }
            }
        }

        console.log(`✅ Deleted ${classDeleted} duplicates`);
        grandTotal += classDeleted;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Total deleted: ${grandTotal} duplicate requirements`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
