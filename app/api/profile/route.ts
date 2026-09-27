import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { deleteProfileForUser, getProfileForUser, saveProfileForUser } from "@/lib/db";
import { ProfileSchema } from "@/lib/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const profile = await getProfileForUser(session.user.id);
    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (err) {
    console.error("Failed to read profile:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load your profile." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Request did not match the expected profile shape." },
      { status: 400 },
    );
  }

  try {
    await saveProfileForUser(session.user.id, parsed.data);
    return NextResponse.json({ data: parsed.data }, { status: 200 });
  } catch (err) {
    console.error("Failed to save profile:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not save your profile." }, { status: 502 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    await deleteProfileForUser(session.user.id);
    return NextResponse.json({ data: null }, { status: 200 });
  } catch (err) {
    console.error("Failed to delete profile:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not delete your profile." }, { status: 502 });
  }
}
