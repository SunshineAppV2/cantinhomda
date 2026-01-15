
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
    const email = 'master@cantinhomda.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            club: true
        }
    });

    if (user) {
        console.log('User Found:');
        console.log('ID:', user.id);
        console.log('Name:', user.name);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('ClubID:', user.clubId);
        console.log('Club Name:', user.club?.name);
    } else {
        console.log('USER NOT FOUND!');
    }
}

checkUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
