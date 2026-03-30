# Todoist Clone - Backend

REST API for the Todoist Clone project.

## Tech Stack

- **Runtime**: Node.js + TypeScript (strict mode)
- **Framework**: Express 5
- **ORM**: Prisma 7
- **Database**: PostgreSQL
- **Validation**: Zod v4

## Architecture

```
src/
├── config/          # Environment & database configuration
├── controllers/     # HTTP request/response handling
├── services/        # Business logic (framework-agnostic)
├── repositories/    # Data access layer (Prisma queries)
├── validators/      # Zod schemas for request validation
├── middlewares/      # Express middlewares (error handler, auth, etc.)
├── errors/          # Custom error classes (AppError, NotFoundError, etc.)
├── routes/          # Route definitions and registry
├── types/           # Shared TypeScript interfaces
├── utils/           # Helper functions
├── app.ts           # Express app setup
└── server.ts        # Entry point
```

**Request flow**: Route -> Controller -> Validator -> Service -> Repository -> Prisma -> DB

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env and configure database URL
cp .env.example .env

# 3. Generate Prisma client
npm run db:generate

# 4. Run migrations (requires running PostgreSQL)
npm run db:migrate

# 5. Start dev server
npm run dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled JS (production) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to DB (no migration) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Data Model

- **Project**: name, color, order
- **Task**: title, description, dueDate (UTC), priority (1-4), completed, order
  - Self-referencing `parentId` for sub-tasks
  - Belongs to a Project

## Assumptions

- No authentication in initial setup (to be added later).
- Dates stored in UTC; timezone conversion is a client concern.
- Priority values: 1 = Urgent, 2 = High, 3 = Medium, 4 = None.
