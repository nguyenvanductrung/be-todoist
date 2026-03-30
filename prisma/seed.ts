/**
 * Prisma Seed Script — Todoist Clone
 *
 * Creates demo data for development:
 * - 1 User
 * - 3 Projects (Work, Personal, Shopping)
 * - ~15 Tasks across projects with varied due dates, priorities, sub-tasks
 *
 * Run: npx prisma db seed
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Date helpers ────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0); // noon UTC to avoid edge-case timezone issues
  return date;
}

function today(): Date {
  return daysFromNow(0);
}

// ── Seed ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters for FK constraints)
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // ── User ────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: 'demo@todoist.local',
      name: 'Demo User',
      // passwordHash intentionally null — auth not implemented yet
    },
  });

  console.log(`  ✓ User: ${user.name} (${user.email})`);

  // ── Projects ────────────────────────────────────────────────
  const [work, personal, shopping] = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Work',
        color: '#db4035',
        order: 0,
        userId: user.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Personal',
        color: '#4073ff',
        order: 1,
        isFavorite: true,
        userId: user.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Shopping',
        color: '#299438',
        order: 2,
        userId: user.id,
      },
    }),
  ]);

  console.log(`  ✓ Projects: ${work.name}, ${personal.name}, ${shopping.name}`);

  // ── Tasks ───────────────────────────────────────────────────
  // Helper to reduce boilerplate
  const baseTask = { userId: user.id };

  // --- Today tasks (3) ---
  const todayTask1 = await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Review pull request #42',
      description: 'Check code quality and test coverage before merging',
      dueDate: today(),
      priority: 1, // Urgent
      order: 0,
      projectId: work.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Daily standup meeting',
      dueDate: today(),
      priority: 3, // Medium
      order: 1,
      projectId: work.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Go for a 30-minute run',
      dueDate: today(),
      priority: 2, // High
      order: 0,
      projectId: personal.id,
    },
  });

  // --- Upcoming tasks (3) — due within next 7 days ---
  const upcomingTask1 = await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Prepare sprint demo presentation',
      description: 'Slides + live demo of new features',
      dueDate: daysFromNow(2),
      priority: 2, // High
      order: 2,
      projectId: work.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Dentist appointment',
      dueDate: daysFromNow(4),
      priority: 3, // Medium
      order: 1,
      projectId: personal.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Plan weekend trip itinerary',
      description: 'Research hotels and restaurants',
      dueDate: daysFromNow(5),
      priority: 4, // None
      order: 2,
      projectId: personal.id,
    },
  });

  // --- Overdue tasks (2) ---
  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Submit expense report for March',
      dueDate: daysFromNow(-3),
      priority: 1, // Urgent
      order: 3,
      projectId: work.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Return library books',
      dueDate: daysFromNow(-1),
      priority: 3, // Medium
      order: 3,
      projectId: personal.id,
    },
  });

  // --- Completed tasks (2) ---
  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Set up project repository',
      dueDate: daysFromNow(-5),
      priority: 2,
      completed: true,
      completedAt: daysFromNow(-5),
      order: 4,
      projectId: work.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Buy birthday present for Mom',
      dueDate: daysFromNow(-2),
      priority: 1,
      completed: true,
      completedAt: daysFromNow(-3),
      order: 4,
      projectId: personal.id,
    },
  });

  // --- Shopping list tasks (no due date, priority None) ---
  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Milk & eggs',
      priority: 4,
      order: 0,
      projectId: shopping.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Bread (whole wheat)',
      priority: 4,
      order: 1,
      projectId: shopping.id,
    },
  });

  // --- Sub-tasks (2 parents with 2 children each) ---

  // Sub-tasks for "Review pull request #42"
  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Check unit test coverage',
      dueDate: today(),
      priority: 1,
      order: 0,
      projectId: work.id,
      parentId: todayTask1.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Review API error handling',
      dueDate: today(),
      priority: 2,
      order: 1,
      projectId: work.id,
      parentId: todayTask1.id,
    },
  });

  // Sub-tasks for "Prepare sprint demo presentation"
  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Create demo slide deck',
      dueDate: daysFromNow(1),
      priority: 2,
      order: 0,
      projectId: work.id,
      parentId: upcomingTask1.id,
    },
  });

  await prisma.task.create({
    data: {
      ...baseTask,
      title: 'Set up demo environment',
      dueDate: daysFromNow(2),
      priority: 3,
      order: 1,
      projectId: work.id,
      parentId: upcomingTask1.id,
    },
  });

  // ── Summary ─────────────────────────────────────────────────
  const taskCount = await prisma.task.count();
  const parentCount = await prisma.task.count({ where: { parentId: null } });
  const subTaskCount = await prisma.task.count({ where: { parentId: { not: null } } });

  console.log(
    `  ✓ Tasks: ${String(taskCount)} total (${String(parentCount)} root + ${String(subTaskCount)} sub-tasks)`,
  );
  console.log('✅ Seed complete!');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
    void pool.end();
  });
