const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate specialties...\n');

    const allSpecialties = await prisma.specialty.findMany();

    console.log(`Total specialties found: ${allSpecialties.length}\n`);

    const grouped = new Map();

    for (const spec of allSpecialties) {
        const baseName = spec.name.replace(/^[A-Z]+-\d+\s*-\s*/, '').trim();

        if (!grouped.has(baseName)) {
            grouped.set(baseName, []);
        }
        grouped.get(baseName).push(spec);
    }

    let totalDeleted = 0;

    for (const [baseName, specs] of grouped.entries()) {
        if (specs.length > 1) {
            console.log(`\n📋 Found ${specs.length} entries for: ${baseName}`);

            const withCode = specs.find(s => /^[A-Z]+-\d+\s*-\s*/.test(s.name));
            const toKeep = withCode || specs[0];

            console.log(`  ✅ Keeping: ${toKeep.name}`);

            for (const spec of specs) {
                if (spec.id !== toKeep.id) {
                    console.log(`  🗑️  Deleting: ${spec.name}`);
                    await prisma.specialty.delete({
                        where: { id: spec.id }
                    });
                    totalDeleted++;
                }
            }
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Cleanup complete!`);
    console.log(`   Deleted: ${totalDeleted} duplicates`);

    const finalCount = await prisma.specialty.count();
    console.log(`   Final count: ${finalCount} specialties`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
