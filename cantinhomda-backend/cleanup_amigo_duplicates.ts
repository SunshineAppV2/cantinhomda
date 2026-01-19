
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate requirements for AMIGO class...\n');

    // Get all requirements for AMIGO class
    const amigoRequirements = await prisma.requirement.findMany({
        where: {
            dbvClass: 'AMIGO',
            clubId: null
        },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${amigoRequirements.length} total requirements for AMIGO class\n`);

    // Group by description (first 50 chars to catch duplicates)
    const descMap = new Map<string, any[]>();

    for (const req of amigoRequirements) {
        const key = req.description.substring(0, 50).trim();
        if (!descMap.has(key)) {
            descMap.set(key, []);
        }
        descMap.get(key)!.push(req);
    }

    let totalDeleted = 0;

    // For each group of duplicates
    for (const [desc, reqs] of descMap.entries()) {
        if (reqs.length > 1) {
            console.log(`\n📋 Duplicate found: "${desc}..." (${reqs.length}x)`);

            // Prefer the one with code starting with "I.", "II.", etc (Roman numerals)
            const withRomanCode = reqs.find(r => r.code && /^[IVX]+\./.test(r.code));
            const toKeep = withRomanCode || reqs[0]; // Keep first if no Roman code found

            console.log(`  ✅ Keeping: Code="${toKeep.code}", ID=${toKeep.id}`);

            // Delete the rest
            for (const req of reqs) {
                if (req.id !== toKeep.id) {
                    console.log(`  🗑️  Deleting: Code="${req.code}", ID=${req.id}`);
                    await prisma.requirement.delete({
                        where: { id: req.id }
                    });
                    totalDeleted++;
                }
            }
        }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate requirements.`);

    // Show final count
    const finalCount = await prisma.requirement.count({
        where: {
            dbvClass: 'AMIGO',
            clubId: null
        }
    });

    console.log(`📊 Final count: ${finalCount} requirements for AMIGO class`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
