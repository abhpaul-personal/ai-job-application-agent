// Server-only: talks to Postgres via Neon's serverless driver (the current
// Vercel-recommended path — @vercel/postgres is deprecated in favor of this).
// Never import this from a "use client" component.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { z } from "zod";
import { ProfileSchema, type Profile } from "./schema";

export type SqlQuery = NeonQueryFunction<false, false>;

// Lazily constructed so importing this module doesn't require POSTGRES_URL
// to be set (e.g. in tests, which always inject a fake `sql` instead).
function getSql(): SqlQuery {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not set.");
  }
  return neon(connectionString);
}

export async function getProfileForUser(
  userId: string,
  sql: SqlQuery = getSql(),
): Promise<Profile | null> {
  const rows = await sql`select profile from profiles where user_id = ${userId}`;
  if (rows.length === 0) return null;

  try {
    return ProfileSchema.parse(rows[0].profile);
  } catch (err) {
    // Same discipline as lib/loadProfile.ts: never log err.message/issue
    // messages, since those can echo back the user's actual stored values.
    const detail =
      err instanceof z.ZodError
        ? err.issues.map((issue) => `${issue.path.join(".")} (${issue.code})`).join(", ")
        : "unreadable JSON";
    console.warn(
      `Stored profile for a user does not match ProfileSchema (${detail}); treating as no profile.`,
    );
    return null;
  }
}

export async function saveProfileForUser(
  userId: string,
  profile: Profile,
  sql: SqlQuery = getSql(),
): Promise<void> {
  await sql`
    insert into profiles (user_id, profile, updated_at)
    values (${userId}, ${JSON.stringify(profile)}::jsonb, now())
    on conflict (user_id) do update set profile = excluded.profile, updated_at = excluded.updated_at
  `;
}

export async function deleteProfileForUser(
  userId: string,
  sql: SqlQuery = getSql(),
): Promise<void> {
  await sql`delete from profiles where user_id = ${userId}`;
}
