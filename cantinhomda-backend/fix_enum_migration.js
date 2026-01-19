const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEnumValues() {
    console.log('🔧 Starting enum migration fix...');

    try {
        // Update Users
        const usersUpdated = await prisma.$executeRaw`
            UPDATE "User" 
            SET "dbvClass" = 'GUIA' 
            WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO')
        `;
        console.log(`✅ Updated ${usersUpdated} users`);

        // Update Requirements
        const requirementsUpdated = await prisma.$executeRaw`
            UPDATE "Requirement" 
            SET "dbvClass" = 'GUIA' 
            WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO')
        `;
        console.log(`✅ Updated ${requirementsUpdated} requirements`);

        // Verify
        const remaining = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM "User" 
            WHERE "dbvClass" IN ('LIDER', 'LIDER_MASTER', 'LIDER_MASTER_AVANCADO')
        `;

        console.log(`\n📊 Verification: ${remaining[0].count} records still have old values`);

        if (remaining[0].count === '0') {
            console.log('✅ Migration successful! Safe to deploy new schema.');
        } else {
            console.log('⚠️  Warning: Some records still have old values');
        }

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fixEnumValues()
    .catch(console.error);
