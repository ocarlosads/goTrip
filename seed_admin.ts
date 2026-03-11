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
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Administrador',
                isVerified: true,
            },
        });

        console.log(`Admin user ${admin.email} created/updated successfully.`);
        console.log(`Password set to: ${password}`);
    } catch (err) {
        console.error('Error seeding admin:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
