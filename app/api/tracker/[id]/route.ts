import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { deleteTrackerRecordForUser, saveTrackerRecordForUser } from "@/lib/db";
import { TrackerRecordSchema } from "@/lib/schema";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = TrackerRecordSchema.safeParse(body);
  if (!parsed.success || parsed.data.id !== id) {
    return NextResponse.json(
      { error: "Request did not match the expected tracker record shape." },
      { status: 400 },
    );
  }

  try {
    await saveTrackerRecordForUser(session.user.id, parsed.data);
    return NextResponse.json({ data: parsed.data }, { status: 200 });
  } catch (err) {
    console.error("Failed to save tracker record:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not save this record." }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteTrackerRecordForUser(session.user.id, id);
    return NextResponse.json({ data: null }, { status: 200 });
  } catch (err) {
    console.error("Failed to delete tracker record:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not delete this record." }, { status: 502 });
  }
}
