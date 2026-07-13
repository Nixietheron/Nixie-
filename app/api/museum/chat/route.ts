import { NextRequest, NextResponse } from "next/server";
import { getWalletsForRequest } from "@/lib/wallet-session";
import { getMuseumAccess } from "@/lib/museum-access";
import { createAdminClient } from "@/lib/supabase/server";

const ROOMS = ["lounge", "gallery", "private-viewing"] as const;
type Room = (typeof ROOMS)[number];
const MESSAGE_TTL_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 8_000;

function isRoom(value: string | null): value is Room {
  return !!value && ROOMS.includes(value as Room);
}

async function requireHolder(request: NextRequest) {
  const wallet = getWalletsForRequest(request)?.[0];
  if (!wallet) return { wallet: null, error: NextResponse.json({ error: "Wallet session required" }, { status: 401 }) };
  const access = await getMuseumAccess(wallet);
  if (!access.allowed) return { wallet: null, error: NextResponse.json({ error: "Museum pass required" }, { status: 403 }) };
  return { wallet, error: null };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { wallet, error } = await requireHolder(request);
  if (error || !wallet) return error!;
  const room = request.nextUrl.searchParams.get("room");
  if (!isRoom(room)) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("museum_chat_messages").delete().lte("expires_at", new Date().toISOString());
  const { data, error: queryError } = await admin
    .from("museum_chat_messages")
    .select("id, room, wallet, display_name, body, created_at, expires_at")
    .eq("room", room)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(80);
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [], expiresInMs: MESSAGE_TTL_MS });
}

export async function POST(request: NextRequest) {
  const { wallet, error } = await requireHolder(request);
  if (error || !wallet) return error!;
  const body = await request.json().catch(() => null) as { room?: unknown; body?: unknown } | null;
  const room = typeof body?.room === "string" ? body.room : null;
  const text = typeof body?.body === "string" ? body.body.trim().replace(/\s+/g, " ") : "";
  if (!isRoom(room) || text.length < 1 || text.length > 280) return NextResponse.json({ error: "Message must be 1–280 characters and sent to a valid room." }, { status: 400 });
  const admin = createAdminClient();
  const since = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
  const { data: recent } = await admin.from("museum_chat_messages").select("id").eq("wallet", wallet).gte("created_at", since).limit(1);
  if (recent?.length) return NextResponse.json({ error: "Take a breath — you can send another note in a few seconds." }, { status: 429 });
  const { data: profile } = await admin.from("museum_profiles").select("display_name").eq("wallet", wallet).maybeSingle();
  const displayName = profile?.display_name || `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const expiresAt = new Date(Date.now() + MESSAGE_TTL_MS).toISOString();
  const { data, error: insertError } = await admin
    .from("museum_chat_messages")
    .insert({ room, wallet, display_name: displayName, body: text, expires_at: expiresAt })
    .select("id, room, wallet, display_name, body, created_at, expires_at")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}
