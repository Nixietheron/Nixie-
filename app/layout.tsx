import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MiniappReady } from "@/components/miniapp-ready";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-anime",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixie.example.com";

export const metadata: Metadata = {
  title: "Nixie – Exclusive Anime Artwork",
  description: "Unlock exclusive artwork with USDC on Base.",
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/og.png`,
      button: {
        title: "Enter Nixie",
        action: {
          type: "launch_miniapp",
          name: "Nixie",
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: "#F7E8EB",
        },
      },
    }),
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
          <MiniappReady />
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
