import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Nixie",
  description: "Privacy policy for Nixie.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a080c] text-white/85 px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-block text-sm text-[#D27A92] hover:text-[#e8a0b3] mb-10 transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {new Date().getFullYear()}</p>
        <div className="space-y-6 text-[15px] leading-relaxed text-white/70">
          <p>
            Nixie respects your privacy. This policy describes what we may collect and how we use
            it.
          </p>
          <p>
            <strong className="text-white/90">Wallet &amp; chain data.</strong> Public wallet
            addresses and onchain transaction data are visible on the blockchain by design.
          </p>
          <p>
            <strong className="text-white/90">Account data.</strong> If you sign in, we may store
            identifiers required to provide the service (for example, via our authentication
            provider).
          </p>
          <p>
            <strong className="text-white/90">Analytics.</strong> We may use minimal analytics to
            improve the product. You can ask to limit non-essential tracking where applicable.
          </p>
          <p>
            This is a placeholder summary. Replace with counsel-reviewed policy before launch.
          </p>
        </div>
      </div>
    </div>
  );
}
