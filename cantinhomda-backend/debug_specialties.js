const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Investigating database structure...\n');

    // Check Specialties table
    const specialties = await prisma.specialty.findMany({
        take: 5,
        include: {
            requirements: true
        }
    });

    console.log('📊 Sample Specialties:');
    specialties.forEach(s => {
        console.log(`  - ${s.name} (Area: ${s.area})`);
        console.log(`    Requirements: ${s.requirements.length}`);
    });

    const totalSpecialties = await prisma.specialty.count();
    console.log(`\n✅ Total Specialties: ${totalSpecialties}\n`);

    // Check Requirements table for specialty-related items
    const reqsWithArea = await prisma.requirement.findMany({
        where: {
            area: { not: null },
            dbvClass: null
        },
        take: 5
    });

    console.log('📋 Sample Requirements with Area (no dbvClass):');
    reqsWithArea.forEach(r => {
        console.log(`  - ${r.code}: ${r.description.substring(0, 50)}...`);
        console.log(`    Area: ${r.area}, SpecialtyId: ${r.specialtyId}`);
    });

    const totalReqsWithArea = await prisma.requirement.count({
        where: {
            area: { not: null },
            dbvClass: null
        }
    });

    console.log(`\n✅ Total Requirements with Area: ${totalReqsWithArea}\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
