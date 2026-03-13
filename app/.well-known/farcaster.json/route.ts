import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixie.example.com";

export async function GET() {
  const manifest = {
    miniapp: {
      version: "1",
      name: "Nixie",
      homeUrl: APP_URL,
      iconUrl: `${APP_URL}/icon.png`,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#F7E8EB",
      subtitle: "Exclusive anime artwork",
      description: "Unlock NSFW artwork with USDC on Base. Pay via x402.",
      screenshotUrls: [`${APP_URL}/og.png`],
      primaryCategory: "social",
      tags: ["art", "nft", "base", "usdc", "x402"],
      heroImageUrl: `${APP_URL}/og.png`,
      tagline: "Enter Nixie",
      ogTitle: "Nixie – Exclusive Anime Artwork",
      ogDescription: "Unlock exclusive artwork with USDC on Base.",
      ogImageUrl: `${APP_URL}/og.png`,
      noindex: false,
    },
    accountAssociation: {
      header: process.env.FARCASTER_ACCOUNT_HEADER || "",
      payload: process.env.FARCASTER_ACCOUNT_PAYLOAD || "",
      signature: process.env.FARCASTER_ACCOUNT_SIGNATURE || "",
    },
  };

  return NextResponse.json(manifest);
}
