import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import "./globals.css";
import { Providers } from "@/components/providers";
import { serverConfig } from "@/lib/wagmi-server-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";
/** Favicon, Apple touch icon, Open Graph & Twitter/X link previews. */
const BRAND_IMAGE_PATH = "/nixie.webp";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Nixie – 3D Museum",
  description: "A private 3D museum for Nixie token and NFT holders on Robinhood Mainnet.",
  openGraph: {
    title: "Nixie – 3D Museum",
    description: "A private 3D museum for Nixie token and NFT holders on Robinhood Mainnet.",
    url: APP_URL,
    siteName: "Nixie",
    images: [
      {
        url: BRAND_IMAGE_PATH,
        width: 1024,
        height: 1024,
        alt: "Nixie",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nixie – 3D Museum",
    description: "A private 3D museum for Nixie token and NFT holders on Robinhood Mainnet.",
    images: [BRAND_IMAGE_PATH],
  },
  icons: {
    icon: [
      { url: BRAND_IMAGE_PATH, sizes: "1254x1254", type: "image/webp" },
    ],
    apple: [{ url: BRAND_IMAGE_PATH, sizes: "1254x1254", type: "image/webp" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the wagmi cookie from the incoming request to preserve wallet state on refresh.
  const initialState = cookieToInitialState(serverConfig, (await headers()).get("cookie"));

  return (
    <html lang="en">
      <body className="font-anime antialiased safe-top safe-bottom">
        <Providers initialState={initialState}>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
