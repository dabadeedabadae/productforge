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
  documentType?: 'SRS' | 'API' | 'DB' | 'USERFLOWS';
  createdById?: number;
}) {
  const { slug, title, description, schemaJson, documentType = 'SRS', createdById } = opts;

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
      documentType: documentType as any,
      ...(createdById ? { createdById } : {}),
    },
    create: {
      slug,
      title,
      description,
      html,
      isPublished: true,
      schemaJson,
      documentType: documentType as any,
      ...(createdById ? { createdById } : {}),
    },
  });
}

async function ensurePromptPreset(opts: {
  name: string;
  description: string;
  documentType: 'SRS' | 'API' | 'DB' | 'USERFLOWS';
  systemPrompt: string;
  userPromptTemplate: string;
  isDefault?: boolean;
  version?: string;
}) {
  const { name, description, documentType, systemPrompt, userPromptTemplate, isDefault = false, version = 'v1' } = opts;

  // Если устанавливается как дефолтный, снимаем флаг с других
  if (isDefault) {
    await prisma.promptPreset.updateMany({
      where: {
        documentType: documentType as any,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  // Ищем существующий пресет
  const existing = await prisma.promptPreset.findFirst({
    where: {
      name,
      documentType: documentType as any,
      version,
    },
  });

  if (existing) {
    return prisma.promptPreset.update({
      where: { id: existing.id },
      data: {
        description,
        systemPrompt,
        userPromptTemplate,
        isDefault,
      },
    });
  }

  return prisma.promptPreset.create({
    data: {
      name,
      description,
      documentType: documentType as any,
      systemPrompt,
      userPromptTemplate,
      isDefault,
      version,
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

  // 5) Шаблоны: SRS, API, DB, USERFLOWS
  const srsSchema = {
    title: 'Software Requirements Specification',
    version: 1,
    sections: [
      { id: 'intro',        title: '1. Введение',                 type: 'markdown' },
      { id: 'scope',        title: '2. Цели и задачи',            type: 'markdown' },
      { id: 'actors',       title: '3. Роли и пользователи',      type: 'list' },
      { id: 'functional',   title: '4. Функциональные требования', type: 'list' },
      { id: 'nonfunctional',title: '5. Нефункциональные требования', type: 'list' },
    ],
    intro: '',
    scope: '',
    actors: [],
    functional: [],
    nonfunctional: [],
  };

  const apiSchema = {
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
    overview: '',
    auth: '',
    models: [],
    endpoints: [],
    errors: [],
    rateLimits: '',
  };

  const dbSchema = {
    title: 'Database Model',
    version: 1,
    sections: [
      { id: 'overview', title: '1. Overview', type: 'markdown' },
      { id: 'tables', title: '2. Tables', type: 'list' },
      { id: 'relationships', title: '3. Relationships', type: 'list' },
      { id: 'indexes', title: '4. Indexes', type: 'list' },
    ],
    overview: '',
    tables: [],
    relationships: [],
    indexes: [],
  };

  const userflowsSchema = {
    title: 'User Flows',
    version: 1,
    sections: [
      { id: 'overview', title: '1. Overview', type: 'markdown' },
      { id: 'personas', title: '2. Personas', type: 'list' },
      { id: 'flows', title: '3. User Flows', type: 'list' },
      { id: 'screens', title: '4. Screens', type: 'list' },
    ],
    overview: '',
    personas: [],
    flows: [],
    screens: [],
  };

  const [srsTpl, apiTpl, dbTpl, userflowsTpl] = await Promise.all([
    ensureTemplate({
      slug: 'srs-default-v1',
      title: 'SRS (default)',
      description: 'Базовый SRS-шаблон',
      schemaJson: srsSchema,
      documentType: 'SRS',
      createdById: adminUser.id,
    }),
    ensureTemplate({
      slug: 'api-default-v1',
      title: 'API Spec (default)',
      description: 'Базовый шаблон API-спецификации',
      schemaJson: apiSchema,
      documentType: 'API',
      createdById: adminUser.id,
    }),
    ensureTemplate({
      slug: 'db-default-v1',
      title: 'DB Model (default)',
      description: 'Базовый шаблон модели БД',
      schemaJson: dbSchema,
      documentType: 'DB',
      createdById: adminUser.id,
    }),
    ensureTemplate({
      slug: 'userflows-default-v1',
      title: 'User Flows (default)',
      description: 'Базовый шаблон пользовательских сценариев',
      schemaJson: userflowsSchema,
      documentType: 'USERFLOWS',
      createdById: adminUser.id,
    }),
  ]);

  // 5.1) Промпт-пресеты для каждого типа документа
  const srsSystemPrompt = `Ты — опытный инженер требований и системный аналитик. Твоя задача — создавать детальные, структурированные SRS документы.

Требования:
- Используй профессиональную терминологию
- Структурируй информацию логично и последовательно
- Включай конкретные примеры и сценарии использования
- Учитывай уровень детализации: {detailLevel}
- Язык: русский (если не указано иное)`;

  const srsUserPrompt = `Описание системы:
{concept}

Домен / контекст: {domain}

Уровень детализации: {detailLevel}

Структура документа:
{schemaJson}

Заполни структуру под этот проект. Верни только JSON без дополнительных комментариев.`;

  const apiSystemPrompt = `Ты — архитектор API и backend-разработчик. Создавай детальные API спецификации.

Требования:
- Описывай endpoints с методами, параметрами, телами запросов/ответов
- Включай примеры запросов и ответов
- Указывай коды ошибок и их значения
- Описывай модели данных с типами и валидацией
- Учитывай уровень детализации: {detailLevel}
- Язык: русский (если не указано иное)`;

  const apiUserPrompt = `Описание системы:
{concept}

Домен / контекст: {domain}

Уровень детализации: {detailLevel}

Структура документа:
{schemaJson}

Заполни структуру API спецификации. Верни только JSON без дополнительных комментариев.`;

  const dbSystemPrompt = `Ты — проектировщик баз данных. Создавай детальные схемы БД.

Требования:
- Описывай таблицы с полями, типами, ограничениями
- Указывай связи между таблицами (foreign keys)
- Описывай индексы и их назначение
- Включай примеры данных
- Учитывай уровень детализации: {detailLevel}
- Язык: русский (если не указано иное)`;

  const dbUserPrompt = `Описание системы:
{concept}

Домен / контекст: {domain}

Уровень детализации: {detailLevel}

Структура документа:
{schemaJson}

Заполни структуру модели БД. Верни только JSON без дополнительных комментариев.`;

  const userflowsSystemPrompt = `Ты — UX-аналитик и проектировщик интерфейсов. Создавай детальные пользовательские сценарии.

Требования:
- Описывай персоны пользователей
- Детализируй user flows с шагами и действиями
- Описывай экраны и их элементы
- Включай альтернативные сценарии и обработку ошибок
- Учитывай уровень детализации: {detailLevel}
- Язык: русский (если не указано иное)`;

  const userflowsUserPrompt = `Описание системы:
{concept}

Домен / контекст: {domain}

Уровень детализации: {detailLevel}

Структура документа:
{schemaJson}

Заполни структуру пользовательских сценариев. Верни только JSON без дополнительных комментариев.`;

  await Promise.all([
    ensurePromptPreset({
      name: 'SRS Default v1',
      description: 'Базовый промпт для SRS',
      documentType: 'SRS',
      systemPrompt: srsSystemPrompt,
      userPromptTemplate: srsUserPrompt,
      isDefault: true,
      version: 'v1',
    }),
    ensurePromptPreset({
      name: 'SRS Detailed v2',
      description: 'Расширенный промпт для детального SRS',
      documentType: 'SRS',
      systemPrompt: srsSystemPrompt,
      userPromptTemplate: srsUserPrompt,
      isDefault: false,
      version: 'v2',
    }),
    ensurePromptPreset({
      name: 'API Default v1',
      description: 'Базовый промпт для API',
      documentType: 'API',
      systemPrompt: apiSystemPrompt,
      userPromptTemplate: apiUserPrompt,
      isDefault: true,
      version: 'v1',
    }),
    ensurePromptPreset({
      name: 'DB Default v1',
      description: 'Базовый промпт для БД',
      documentType: 'DB',
      systemPrompt: dbSystemPrompt,
      userPromptTemplate: dbUserPrompt,
      isDefault: true,
      version: 'v1',
    }),
    ensurePromptPreset({
      name: 'User Flows Default v1',
      description: 'Базовый промпт для User Flows',
      documentType: 'USERFLOWS',
      systemPrompt: userflowsSystemPrompt,
      userPromptTemplate: userflowsUserPrompt,
      isDefault: true,
      version: 'v1',
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
  console.log(`Templates: SRS#${srsTpl.id}, API#${apiTpl.id}, DB#${dbTpl.id}, UserFlows#${userflowsTpl.id}`);
  console.log('Prompt presets created for all document types');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
