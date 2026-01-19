
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Analyzing ADRA specialty requirements...\n');

    const adraSpecialties = await prisma.specialty.findMany({
        where: { area: 'ADRA' },
        include: {
            requirements: {
                orderBy: { code: 'asc' }
            }
        }
    });

    for (const specialty of adraSpecialties) {
        console.log(`\n📋 ${specialty.name} (${specialty.requirements.length} requirements)`);

        // Group by description to find duplicates
        const descMap = new Map<string, any[]>();

        for (const req of specialty.requirements) {
            const key = req.description.substring(0, 50); // First 50 chars
            if (!descMap.has(key)) {
                descMap.set(key, []);
            }
            descMap.get(key)!.push(req);
        }

        // Show duplicates
        for (const [desc, reqs] of descMap.entries()) {
            if (reqs.length > 1) {
                console.log(`  ⚠️  DUPLICATE: "${desc}..." (${reqs.length}x)`);
                reqs.forEach(r => console.log(`      - ID: ${r.id}, Code: ${r.code || 'NULL'}, Created: ${r.createdAt}`));
            }
        }

        // Show all requirements
        console.log(`  Requirements:`);
        specialty.requirements.forEach(r => {
            console.log(`    ${r.code || '?'}: ${r.description.substring(0, 60)}...`);
        });
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
