import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
    const email = 'admin@gotrip.app.br';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const admin = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                isVerified: true,
                role: 'ADMIN' as any,
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Administrador',
                isVerified: true,
                role: 'ADMIN' as any,
            },
        });

        console.log(`Admin user ${admin.email} created/updated successfully.`);
        console.log(`Password set to: ${password}`);

        // Seed sample groups
        const groups = [
            {
                name: 'Eurotrip 2026',
                description: 'Explorando o melhor da Europa!',
                type: 'group',
                ownerId: admin.id,
                inviteCode: 'EURO-26',
                startDate: new Date('2026-06-15T12:00:00Z'),
                endDate: new Date('2026-06-30T12:00:00Z'),
                image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1470&auto=format&fit=crop'
            },
            {
                name: 'Arraial do Cabo',
                description: 'Paraíso das águas cristalinas no RJ.',
                type: 'couple',
                ownerId: admin.id,
                inviteCode: 'ARRA-22',
                startDate: new Date('2026-11-20T12:00:00Z'),
                endDate: new Date('2026-11-27T12:00:00Z'),
                image: 'https://images.unsplash.com/photo-1591543620767-58ec7f37f374?q=80&w=1470&auto=format&fit=crop'
            }
        ];

        for (const gData of groups) {
            await (prisma.group as any).create({
                data: {
                    ...gData,
                    members: {
                        create: { userId: admin.id, role: 'OWNER' }
                    }
                }
            });
            console.log(`Group ${gData.name} created.`);
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
