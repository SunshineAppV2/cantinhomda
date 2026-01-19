
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up duplicate specialties...\n');

    // Get all specialties
    const allSpecialties = await prisma.specialty.findMany();

    console.log(`Total specialties found: ${allSpecialties.length}\n`);

    // Group by name (without code prefix)
    const grouped = new Map<string, any[]>();

    for (const spec of allSpecialties) {
        // Extract base name (remove code prefix like "AD-001 - ")
        const baseName = spec.name.replace(/^[A-Z]+-\d+\s*-\s*/, '').trim();

        if (!grouped.has(baseName)) {
            grouped.set(baseName, []);
        }
        grouped.get(baseName)!.push(spec);
    }

    let totalDeleted = 0;

    // For each group, keep the one WITH code prefix, delete others
    for (const [baseName, specs] of grouped.entries()) {
        if (specs.length > 1) {
            console.log(`\n📋 Found ${specs.length} entries for: ${baseName}`);

            // Find the one with proper code format (XX-XXX - Name)
            const withCode = specs.find(s => /^[A-Z]+-\d+\s*-\s*/.test(s.name));
            const toKeep = withCode || specs[0];

            console.log(`  ✅ Keeping: ${toKeep.name}`);

            // Delete the rest
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
