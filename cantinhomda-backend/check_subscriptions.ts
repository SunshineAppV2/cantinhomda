import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubs = await prisma.club.findMany({
        select: {
            id: true,
            name: true,
            subscriptionStatus: true,
            nextBillingDate: true,
            gracePeriodDays: true,
            slug: true
        }
    });

    console.log('--- Club Subscription Status ---');
    console.table(clubs.map(c => ({
        ...c,
        nextBillingDate: c.nextBillingDate ? c.nextBillingDate.toISOString() : 'NULL'
    })));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
