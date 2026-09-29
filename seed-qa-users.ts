import { prisma } from './src/lib/prisma.ts';
import { hashPassword } from './server-auth.ts';
import { Rol } from '@prisma/client';

async function seedQaUsers() {
  const hash = await hashPassword('QaTest123!');

  await prisma.usuario.upsert({
    where: { username: 'qa_operador' },
    update: { passwordHash: hash, activo: true, rol: Rol.OPERADOR },
    create: {
      username: 'qa_operador',
      nombre: 'Operador QA Test',
      rol: Rol.OPERADOR,
      passwordHash: hash,
      activo: true,
    }
  });

  await prisma.usuario.upsert({
    where: { username: 'qa_visor' },
    update: { passwordHash: hash, activo: true, rol: Rol.VISOR },
    create: {
      username: 'qa_visor',
      nombre: 'Visor QA Test',
      rol: Rol.VISOR,
      passwordHash: hash,
      activo: true,
    }
  });

  console.log('QA Users seeded successfully');
  await prisma.$disconnect();
}

seedQaUsers().catch(console.error);
