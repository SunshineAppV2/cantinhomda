
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- DEBUGGING RANKING CALCULATION ---");

    // 1. Find the 'RANKING 2026' event
    const eventName = 'RANKING 2026'; // Based on screenshot
    // Or try to find any event
    const events = await prisma.regionalEvent.findMany();
    console.log(`Found ${events.length} events:`);
    events.forEach(e => console.log(` - [${e.id}] ${e.title}`));

    const targetEvent = events.find(e => e.title.toUpperCase().includes('RANKING') || e.title.includes('2026'));

    if (!targetEvent) {
        console.error("Target event 'RANKING 2026' not found in DB.");
        return;
    }

    console.log(`\nTargeting Event: ${targetEvent.title} (${targetEvent.id})`);

    // 2. Find Requirements for this event
    const requirements = await prisma.requirement.findMany({
        where: { regionalEventId: targetEvent.id }
    });
    console.log(`Found ${requirements.length} requirements for this event.`);
    requirements.forEach(r => console.log(` - [${r.id}] ${r.title} (${r.points} pts)`));

    if (requirements.length === 0) {
        console.warn("No requirements found! Ranking will validly be 0.");
        return;
    }

    const reqIds = requirements.map(r => r.id);

    // 3. Find Approved Responses
    const responses = await prisma.eventResponse.findMany({
        where: {
            requirementId: { in: reqIds },
            status: 'APPROVED'
        },
        include: {
            club: true,
            requirement: true
        }
    });

    console.log(`\nFound ${responses.length} APPROVED responses.`);

    // Group by Club
    const clubPoints = new Map<string, number>();

    responses.forEach(r => {
        const current = clubPoints.get(r.club.name) || 0;
        const pts = r.requirement.points || 0;
        clubPoints.set(r.club.name, current + pts);
        console.log(` + ${r.club.name}: ${r.requirement.title} (+${pts})`);
    });

    console.log("\n--- CALCULATED SCORES ---");
    for (const [clubName, points] of clubPoints.entries()) {
        console.log(`${clubName}: ${points} points`);
    }

    // Check if there are PENDING responses
    const pendingResponses = await prisma.eventResponse.count({
        where: {
            requirementId: { in: reqIds },
            status: 'PENDING'
        }
    });
    console.log(`\n(There are ${pendingResponses} PENDING responses waiting for approval)`);

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
