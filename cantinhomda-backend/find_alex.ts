
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for ALEX...');
    const users = await prisma.user.findMany({
        where: {
            name: { contains: 'ALEX', mode: 'insensitive' }
        }
    });
    console.log(`Found ${users.length} users.`);
    users.forEach(u => {
        console.log(`User: ${u.name} | ID: ${u.id} | UID: ${u.uid} | Email: ${u.email} | Role: ${u.role}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
