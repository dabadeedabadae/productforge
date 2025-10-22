// prisma/seeds/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.create({
      data: { name: 'users.read', description: 'Read users' },
    }),
    prisma.permission.create({
      data: { name: 'users.write', description: 'Write users' },
    }),
    prisma.permission.create({
      data: { name: 'roles.read', description: 'Read roles' },
    }),
    prisma.permission.create({
      data: { name: 'roles.write', description: 'Write roles' },
    }),
  ]);

  // Create admin role
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Administrator with full access',
      permissions: {
        connect: permissions.map(p => ({ id: p.id })),
      },
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      roleId: adminRole.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });