-- Run this once against your provisioned Postgres instance (e.g. via the
-- Neon SQL editor in the Vercel dashboard, or `psql "$POSTGRES_URL" -f db/schema.sql`).
-- One table, keyed by the signed-in user's id — same Profile JSON shape as
-- lib/schema.ts, no separate migration tool for a single table.

create table if not exists profiles (
  user_id text primary key,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);
