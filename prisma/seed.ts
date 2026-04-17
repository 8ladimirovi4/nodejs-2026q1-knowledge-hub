import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { ArticleStatus, PrismaClient, UserRole } from '@prisma/client';
import { requireSaltRounds } from 'src/common/utils';


function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: requireDatabaseUrl(),
  });
  const prisma = new PrismaClient({ adapter });

  const saltRounds = requireSaltRounds();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany();
      await tx.article.deleteMany();
      await tx.tag.deleteMany();
      await tx.category.deleteMany();
      await tx.user.deleteMany();

      const passwordAdmin = await bcrypt.hash('admin123', saltRounds);
      const passwordEditor = await bcrypt.hash('editor123', saltRounds);

      const admin = await tx.user.create({
        data: {
          login: 'admin',
          password: passwordAdmin,
          role: UserRole.ADMIN,
        },
      });

      const editor = await tx.user.create({
        data: {
          login: 'editor',
          password: passwordEditor,
          role: UserRole.EDITOR,
        },
      });

      const catBackend = await tx.category.create({
        data: {
          name: 'Backend',
          description: 'Server-side and APIs',
        },
      });

      const catFrontend = await tx.category.create({
        data: {
          name: 'Frontend',
          description: 'UI and client apps',
        },
      });

      const catDevOps = await tx.category.create({
        data: {
          name: 'DevOps',
          description: 'CI/CD and infrastructure',
        },
      });

      const tags = await Promise.all([
        tx.tag.create({ data: { name: 'nodejs' } }),
        tx.tag.create({ data: { name: 'nestjs' } }),
        tx.tag.create({ data: { name: 'typescript' } }),
        tx.tag.create({ data: { name: 'prisma' } }),
        tx.tag.create({ data: { name: 'postgresql' } }),
      ]);

      const [tNode, tNest, tTs, tPrisma, tPg] = tags;

      const a1 = await tx.article.create({
        data: {
          title: 'Getting started with NestJS',
          content: 'NestJS is a progressive Node.js framework.',
          status: ArticleStatus.PUBLISHED,
          authorId: admin.id,
          categoryId: catBackend.id,
          tags: { connect: [{ id: tNest.id }, { id: tNode.id }] },
        },
      });

      const a2 = await tx.article.create({
        data: {
          title: 'Prisma migrations draft',
          content: 'Work in progress on database migrations.',
          status: ArticleStatus.DRAFT,
          authorId: editor.id,
          categoryId: catBackend.id,
          tags: { connect: [{ id: tPrisma.id }, { id: tPg.id }] },
        },
      });

      const a3 = await tx.article.create({
        data: {
          title: 'TypeScript tips',
          content: 'Use strict mode for safer code.',
          status: ArticleStatus.PUBLISHED,
          authorId: editor.id,
          categoryId: catFrontend.id,
          tags: { connect: [{ id: tTs.id }] },
        },
      });

      const a4 = await tx.article.create({
        data: {
          title: 'Docker compose overview',
          content: 'Orchestrating services locally.',
          status: ArticleStatus.ARCHIVED,
          authorId: admin.id,
          categoryId: catDevOps.id,
          tags: { connect: [{ id: tNode.id }, { id: tPg.id }] },
        },
      });

      const a5 = await tx.article.create({
        data: {
          title: 'REST API design',
          content: 'Resources, verbs, and status codes.',
          status: ArticleStatus.PUBLISHED,
          authorId: admin.id,
          categoryId: catFrontend.id,
          tags: { connect: [{ id: tNest.id }, { id: tTs.id }, { id: tNode.id }] },
        },
      });

      await tx.comment.createMany({
        data: [
          {
            content: 'Very helpful introduction.',
            articleId: a1.id,
            authorId: editor.id,
          },
          {
            content: 'Waiting for the final version.',
            articleId: a2.id,
            authorId: admin.id,
          },
          {
            content: 'Saved for later.',
            articleId: a3.id,
            authorId: admin.id,
          },
          {
            content: 'TBD.',
            articleId: a4.id,
            authorId: admin.id,
          },
          {
            content: 'Also TBD.',
            articleId: a5.id,
            authorId: admin.id,
          },
        ],
      });

      console.log(
        `Seed OK: users ${admin.login}, ${editor.login}; categories 3; tags 5; articles 5 (${a1.id.slice(0, 8)}…); comments 3.`,
      );
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
