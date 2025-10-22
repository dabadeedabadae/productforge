// src/prisma/seeds/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1) роли
  const [adminRole, managerRole, viewerRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Full access' },
    }),
    prisma.role.upsert({
      where: { name: 'manager' },
      update: {},
      create: { name: 'manager', description: 'Manage resources' },
    }),
    prisma.role.upsert({
      where: { name: 'viewer' },
      update: {},
      create: { name: 'viewer', description: 'Read-only' },
    }),
  ]);

  // 2) permissions
  const permNames = [
    'users.read',
    'users.write',
    'roles.read',
    'roles.write',
    'permissions.read',
    'permissions.write',
  ];

  const createdPerms = await Promise.all(
    permNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: name },
      }),
    ),
  );

  // 3) прикрепим все права к роли admin
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        set: [], // очищаем, чтобы не дублировать при повторном запуске
        connect: createdPerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // 4) создадим/обновим пользователя-админа (UPsert, а не update)
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { roleId: adminRole.id }, // если существовал — просто убедимся, что роль admin
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: passwordHash,
      roleId: adminRole.id,
    },
    include: { role: true },
  });

  console.log('Seed OK. Admin:', adminUser.email, 'role:', adminUser.role.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
