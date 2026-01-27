# Phase 1 Database Setup (Supabase)

This project uses Supabase migrations in `supabase/migrations`.

## Local Setup

1. Install Supabase CLI

```bash
npm install -g supabase
```

2. Login and link the project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

3. Run migrations locally

```bash
supabase start
supabase migration up
```

## Remote Setup

Apply migrations to your Supabase project:

```bash
supabase db push
```

## Verify

Ensure tables match `src/types/database.types.ts`.
