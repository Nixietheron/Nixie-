import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · Nixie",
  description: "Terms of service for Nixie.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a080c] text-white/85 px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-block text-sm text-[#D27A92] hover:text-[#e8a0b3] mb-10 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {new Date().getFullYear()}</p>
        <div className="space-y-6 text-[15px] leading-relaxed text-white/70">
          <p>
            These terms govern your use of Nixie and any purchases or unlocks made through the
            service. By using the site, you agree to these terms.
          </p>
          <p>
            <strong className="text-white/90">Content.</strong> Artwork is provided for personal,
            non-commercial viewing unless otherwise stated. Redistribution or resale of unlocked
            files may be prohibited by the creator.
          </p>
          <p>
            <strong className="text-white/90">Payments.</strong> Onchain payments (including USDC
            on Base) are final once confirmed on chain, except where required by law.
          </p>
          <p>
            <strong className="text-white/90">Eligibility.</strong> You must be of legal age in
            your jurisdiction to purchase adult-oriented content where applicable.
          </p>
          <p>
            This is a placeholder summary. Replace with counsel-reviewed terms before launch.
          </p>
        </div>
      </div>
    </div>
  );
}
