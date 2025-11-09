// src/prisma/seeds/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensurePermissions(names: string[]) {
  return Promise.all(
    names.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: name },
      }),
    ),
  );
}

async function ensureRole(name: string, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description },
  });
}

async function ensureTags(names: string[]) {
  for (const name of names) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  return prisma.tag.findMany({ where: { name: { in: names } } });
}

async function ensureCategories(names: string[]) {
  for (const name of names) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  return prisma.category.findMany({ where: { name: { in: names } } });
}

async function ensureTemplate(opts: {
  slug: string;
  title: string;
  description: string;
  schemaJson: any;
  createdById?: number;
}) {
  const { slug, title, description, schemaJson, createdById } = opts;

  const html = `<h1>{{title}}</h1>
<p><strong>Template slug:</strong> ${slug}</p>
<pre>{{json}}</pre>`;

  return prisma.template.upsert({
    where: { slug },
    update: {
      title,
      description,
      html,
      isPublished: true,
      schemaJson,
      ...(createdById ? { createdById } : {}),
    },
    create: {
      slug,
      title,
      description,
      html,
      isPublished: true,
      schemaJson,
      ...(createdById ? { createdById } : {}),
    },
  });
}

async function ensureKBItem(opts: {
  slug: string;
  title: string;
  summary: string;
  content: string;
  domain?: string;
  solutionType?: string;
  techStack?: any;
  tagNames?: string[];
  categoryNames?: string[];
  createdById?: number;
}) {
  const {
    slug,
    title,
    summary,
    content,
    domain,
    solutionType,
    techStack,
    tagNames = [],
    categoryNames = [],
    createdById,
  } = opts;

  // создаём/проверяем теги/категории
  const tags = await ensureTags(tagNames);
  const cats = await ensureCategories(categoryNames);

  // есть ли уже такой элемент?
  const exists = await prisma.kBItem.findFirst({ where: { slug } });
  if (exists) {
    // обновим базовые поля и связи (с чисткой связей)
    await prisma.kBItemTag.deleteMany({ where: { kbItemId: exists.id } });
    await prisma.kBItemCategory.deleteMany({ where: { kbItemId: exists.id } });

    return prisma.kBItem.update({
      where: { id: exists.id },
      data: {
        title,
        summary,
        content,
        domain,
        solutionType,
        techStack,
        ...(createdById ? { createdById } : {}),
        tags: { createMany: { data: tags.map((t) => ({ tagId: t.id })), skipDuplicates: true } },
        categories: {
          createMany: { data: cats.map((c) => ({ categoryId: c.id })), skipDuplicates: true },
        },
      },
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });
  }

  // создать новый
  return prisma.kBItem.create({
    data: {
      slug,
      title,
      summary,
      content,
      domain,
      solutionType,
      techStack,
      ...(createdById ? { createdById } : {}),
      tags: { createMany: { data: tags.map((t) => ({ tagId: t.id })), skipDuplicates: true } },
      categories: {
        createMany: { data: cats.map((c) => ({ categoryId: c.id })), skipDuplicates: true },
      },
    },
    include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
  });
}

async function main() {
  // 1) Роли
  const [adminRole, managerRole, viewerRole] = await Promise.all([
    ensureRole('admin', 'Full access'),
    ensureRole('manager', 'Manage resources'),
    ensureRole('viewer', 'Read-only'),
  ]);

  // 2) Права (расширенный набор)
  const permNames = [
    'users.read',
    'users.write',
    'roles.read',
    'roles.write',
    'permissions.read',
    'permissions.write',
    'templates.read',
    'templates.write',
    'kb.read',
    'kb.write',
    'docgen.read',
    'docgen.write',
  ];
  const createdPerms = await ensurePermissions(permNames);

  // 3) Привяжем все права к admin (idempotent)
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        set: [],
        connect: createdPerms.map((p) => ({ id: p.id })),
      },
    },
  });

  // 4) Админ-пользователь
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { roleId: adminRole.id },
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: passwordHash,
      roleId: adminRole.id,
    },
    include: { role: true },
  });

  // 5) Шаблоны: SRS и API
  const srsSchema = {
    kind: 'srs',
    title: 'Software Requirements Specification',
    version: 1,
    sections: [
      { id: 'intro',        title: '1. Введение',                 type: 'markdown' },
      { id: 'scope',        title: '2. Цели и задачи',            type: 'markdown' },
      { id: 'actors',       title: '3. Роли и пользователи',      type: 'list' },
      { id: 'functional',   title: '4. Функциональные требования', type: 'list' },
      { id: 'nonfunctional',title: '5. Нефункциональные требования', type: 'list' },
    ],
  };

  const apiSchema = {
    kind: 'api',
    title: 'API Specification',
    version: 1,
    sections: [
      { id: 'overview',   title: '1. Overview',        type: 'markdown' },
      { id: 'auth',       title: '2. Authentication',  type: 'markdown' },
      { id: 'models',     title: '3. Data Models',     type: 'list' },
      { id: 'endpoints',  title: '4. Endpoints',       type: 'list' },
      { id: 'errors',     title: '5. Error Handling',  type: 'list' },
      { id: 'rateLimits', title: '6. Rate Limits',     type: 'markdown' },
    ],
  };

  const [srsTpl, apiTpl] = await Promise.all([
    ensureTemplate({
      slug: 'srs-default-v1',
      title: 'SRS (default)',
      description: 'Базовый SRS-шаблон',
      schemaJson: srsSchema,
      createdById: adminUser.id,
    }),
    ensureTemplate({
      slug: 'api-default-v1',
      title: 'API Spec (default)',
      description: 'Базовый шаблон API-спецификации',
      schemaJson: apiSchema,
      createdById: adminUser.id,
    }),
  ]);

  // 6) База знаний: теги/категории
  const tagNames = [
    'auth',
    'payments',
    'realtime',
    'ml',
    'analytics',
    'storage',
    'notifications',
    'search',
    'security',
  ];
  const catNames = ['backend', 'frontend', 'security', 'devops', 'data', 'ml', 'mobile', 'infra'];

  await Promise.all([ensureTags(tagNames), ensureCategories(catNames)]);

  // 7) Пример элемента KB
  await ensureKBItem({
    slug: 'auth-oauth2-jwt-nest',
    title: 'Auth: OAuth2 + JWT (NestJS)',
    summary: 'OAuth2 Authorization Code + JWT с ротацией refresh и RBAC; best practices.',
    content:
      'Схемы потоков, таблицы пользователей/ролей/прав. Passport стратегии, ротация refresh, revoke лист, трекинг сессий.',
    domain: 'generic',
    solutionType: 'auth',
    techStack: {
      backend: ['NestJS', 'Passport'],
      database: ['PostgreSQL'],
      services: ['Redis'],
    },
    tagNames: ['auth', 'security'],
    categoryNames: ['backend', 'security'],
    createdById: adminUser.id,
  });

  console.log('Seed OK.');
  console.log(`Admin: ${adminUser.email} (role: ${adminUser.role.name})`);
  console.log(`Templates: SRS#${srsTpl.id}, API#${apiTpl.id}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
