import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-anime",
  display: "swap",
  // Next 14.2.x doesn't ship font override metadata for this family; disable automatic fallback adjustment.
  adjustFontFallback: false,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";
const OG_IMAGE_PATH = "/og.jpg";
const ICON_PATH = "/icon.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Nixie – Exclusive Anime Artwork",
  description: "Unlock exclusive artwork with USDC on Base.",
  other: {
    "base:app_id": "69b947e72d5d7c1605e6333a",
  },
  openGraph: {
    title: "Nixie – Exclusive Anime Artwork",
    description: "Unlock exclusive artwork with USDC on Base.",
    url: APP_URL,
    siteName: "Nixie",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Nixie",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nixie – Exclusive Anime Artwork",
    description: "Unlock exclusive artwork with USDC on Base.",
    images: [OG_IMAGE_PATH],
  },
  icons: {
    icon: ICON_PATH,
    apple: ICON_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mPlusRounded.variable}>
      <body className="font-anime antialiased safe-top safe-bottom">
        <Providers>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
