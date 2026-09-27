import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getTrackerRecordsForUser } from "@/lib/db";

// Create and edit both go through PUT /api/tracker/[id], since
// saveTrackerRecordForUser upserts by id — no separate POST needed.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const records = await getTrackerRecordsForUser(session.user.id);
    return NextResponse.json({ data: records }, { status: 200 });
  } catch (err) {
    console.error("Failed to read tracker records:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load your tracker." }, { status: 502 });
  }
}
