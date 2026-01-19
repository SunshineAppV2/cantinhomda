
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate requirements for ADRA specialties...');

    // Get all ADRA specialties
    const adraSpecialties = await prisma.specialty.findMany({
        where: { area: 'ADRA' },
        include: {
            requirements: {
                orderBy: { createdAt: 'asc' } // Keep the oldest ones
            }
        }
    });

    let totalDeleted = 0;

    for (const specialty of adraSpecialties) {
        console.log(`\nProcessing: ${specialty.name}`);

        // Group requirements by code
        const reqsByCode = new Map<string, any[]>();

        for (const req of specialty.requirements) {
            if (!req.code) continue;

            if (!reqsByCode.has(req.code)) {
                reqsByCode.set(req.code, []);
            }
            reqsByCode.get(req.code)!.push(req);
        }

        // Delete duplicates (keep first, delete rest)
        for (const [code, reqs] of reqsByCode.entries()) {
            if (reqs.length > 1) {
                console.log(`  Code ${code}: Found ${reqs.length} duplicates`);

                // Keep the first one, delete the rest
                const toDelete = reqs.slice(1);

                for (const req of toDelete) {
                    await prisma.requirement.delete({
                        where: { id: req.id }
                    });
                    totalDeleted++;
                }

                console.log(`  Deleted ${toDelete.length} duplicate(s)`);
            }
        }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate requirements.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
