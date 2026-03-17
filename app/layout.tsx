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

export const metadata: Metadata = {
  title: "Nixie – Exclusive Anime Artwork",
  description: "Unlock exclusive artwork with USDC on Base.",
  other: {
    "base:app_id": "69b947e72d5d7c1605e6333a",
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
