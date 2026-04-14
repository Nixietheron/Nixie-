import { NextRequest, NextResponse } from "next/server";
import { getWalletsForRequest } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/server";

type AvatarType = "female" | "male";

function isAvatarType(value: unknown): value is AvatarType {
  return value === "female" || value === "male";
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const wallets = getWalletsForRequest(request);
  if (!wallets?.length) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }
  const wallet = wallets[0];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("museum_profiles")
    .select("wallet, display_name, avatar")
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data
      ? {
          wallet: data.wallet,
          displayName: data.display_name,
          avatar: data.avatar as AvatarType,
        }
      : null,
  });
}

export async function POST(request: NextRequest) {
  const wallets = getWalletsForRequest(request);
  if (!wallets?.length) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const wallet = wallets[0];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedName =
    typeof body === "object" && body !== null && "displayName" in body
      ? String((body as { displayName: unknown }).displayName ?? "").trim()
      : "";
  const parsedAvatar =
    typeof body === "object" && body !== null && "avatar" in body
      ? (body as { avatar: unknown }).avatar
      : undefined;

  if (parsedName.length < 2 || parsedName.length > 40) {
    return NextResponse.json(
      { error: "Name must be between 2 and 40 characters" },
      { status: 400 }
    );
  }
  if (!isAvatarType(parsedAvatar)) {
    return NextResponse.json({ error: "Avatar must be female or male" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("museum_profiles")
    .upsert(
      {
        wallet,
        display_name: parsedName,
        avatar: parsedAvatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" }
    )
    .select("wallet, display_name, avatar")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      wallet: data.wallet,
      displayName: data.display_name,
      avatar: data.avatar as AvatarType,
    },
  });
}
