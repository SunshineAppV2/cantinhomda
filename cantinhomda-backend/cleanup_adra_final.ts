
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up ADRA specialties and requirements...\n');

    // Step 1: Delete all requirements without codes for ADRA specialties
    const adraSpecialties = await prisma.specialty.findMany({
        where: { area: 'ADRA' }
    });

    const specialtyIds = adraSpecialties.map(s => s.id);

    const deletedReqs = await prisma.requirement.deleteMany({
        where: {
            specialtyId: { in: specialtyIds },
            code: null
        }
    });

    console.log(`✅ Deleted ${deletedReqs.count} requirements without codes`);

    // Step 2: Delete specialty entries that start with "AD-" (these are duplicates with wrong names)
    const deletedSpecs = await prisma.specialty.deleteMany({
        where: {
            area: 'ADRA',
            name: { startsWith: 'AD-' }
        }
    });

    console.log(`✅ Deleted ${deletedSpecs.count} specialty entries with code prefixes in name`);

    // Step 3: Show final count
    const finalSpecialties = await prisma.specialty.findMany({
        where: { area: 'ADRA' },
        include: {
            _count: {
                select: { requirements: true }
            }
        }
    });

    console.log(`\n📊 Final ADRA Specialties:`);
    for (const spec of finalSpecialties) {
        console.log(`  - ${spec.name}: ${spec._count.requirements} requirements`);
    }

    console.log(`\n✅ Cleanup complete!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
