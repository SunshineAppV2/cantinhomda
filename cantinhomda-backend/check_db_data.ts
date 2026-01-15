
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Clubs
    const clubs = await prisma.club.findMany({
        select: { id: true, name: true, association: true, region: true, status: true }
    });
    console.log(`Total Clubs: ${clubs.length}`);
    const associations = [...new Set(clubs.map(c => c.association))];
    const regions = [...new Set(clubs.map(c => c.region))];
    console.log('Unique Club Associations:', associations);
    console.log('Unique Club Regions:', regions);

    // 2. Sample Club Data
    if (clubs.length > 0) {
        console.log('Sample Club:', clubs[0]);
    }

    // 3. Check Users in those clubs
    if (clubs.length > 0) {
        const clubIds = clubs.map(c => c.id);
        const userCount = await prisma.user.count({
            where: { clubId: { in: clubIds }, status: 'ACTIVE' }
        });
        console.log(`Total ACTIVE Users in above clubs: ${userCount}`);

        const allUsers = await prisma.user.count();
        console.log(`Total Users in DB (any status): ${allUsers}`);
    }

    console.log('--- DIAGNOSTIC END ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
