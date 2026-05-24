# Stock POS

A multi-tenant Point of Sale system built with Next.js, Prisma, and PostgreSQL.

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Database ORM** — Prisma
- **Database** — PostgreSQL
- **Auth** — JWT sessions (HTTP-only cookies)
- **Styling** — Tailwind CSS

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root of the project:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# JWT secret — use a long random string in production
JWT_SECRET="your-super-secret-key"
```

> **Local example**
> `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockpos"`

### 3. Set up the database

```bash
# Apply all migrations and create the database schema
npx prisma migrate dev --name init

# (Alternative) Push the schema without creating migration files — useful for prototyping
npx prisma db push
```

### 4. Seed the database

The seed creates the **Baraka** merchant, an owner user, categories, products, and default settings.

```bash
npx prisma db seed
```

Default login after seeding:

| Field    | Value                  |
|----------|------------------------|
| Email    | `nandwere@baraka.com`  |
| Password | `art123`               |
| Role     | `OWNER`                |

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Prisma Workflows

### Viewing and editing data (Prisma Studio)

```bash
npx prisma studio
```

Opens a visual browser interface at [http://localhost:5555](http://localhost:5555) where you can browse and edit every table.

### Modifying the schema

1. Edit `prisma/schema.prisma`
2. Create and apply a migration:

```bash
npx prisma migrate dev --name describe_your_change
```

This will:
- Generate a SQL migration file under `prisma/migrations/`
- Apply it to your local database
- Regenerate the Prisma Client

### Regenerating the Prisma Client

Run this whenever `schema.prisma` changes and you need the TypeScript types to update without running a migration (e.g. after a `git pull`):

```bash
npx prisma generate
```

### Resetting the database

Drops and recreates the database, re-applies all migrations, and re-runs the seed:

```bash
npx prisma migrate reset
```

> ⚠️ This deletes all data. Development only.

### Applying migrations in production

```bash
npx prisma migrate deploy
```

Unlike `migrate dev`, this never prompts interactively and never resets data — safe for CI/CD pipelines.

---

## Project Structure