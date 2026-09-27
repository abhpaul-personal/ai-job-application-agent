-- Run this once against your provisioned Postgres instance (e.g. via the
-- Neon SQL editor in the Vercel dashboard, or `psql "$POSTGRES_URL" -f db/schema.sql`).
-- One table, keyed by the signed-in user's id — same Profile JSON shape as
-- lib/schema.ts, no separate migration tool for a single table.

create table if not exists profiles (
  user_id text primary key,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);

-- One row per application-tracker record (a list per user, unlike the
-- single-row-per-user profiles table above), same TrackerRecord JSON shape
-- as lib/schema.ts.
create table if not exists tracker_records (
  id text primary key,
  user_id text not null,
  record jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists tracker_records_user_id_idx on tracker_records (user_id);

-- No DDL/backfill needed when tracker_records gains a new JSON field (e.g.
-- entryOrigin) — this column is jsonb, and TrackerRecordSchema's Zod
-- .default() fills in the new field for any row parsed before it existed.
-- The "migration" is just reading the row through the current schema.
