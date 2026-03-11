import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteAdmin(email: string) {
    if (!email) {
        console.error('Por favor, informe um email: npx tsx promote_admin.ts seu-email@exemplo.com');
        return;
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' } as any,
        });

        console.log(`Usuário ${user.email} promovido a ADMIN com sucesso!`);
    } catch (err) {
        console.error('Erro ao promover usuário. Verifique se o email está correto.');
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

const emailArg = process.argv[2];
promoteAdmin(emailArg);
