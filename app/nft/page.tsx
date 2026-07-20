import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ExternalLink, EyeOff, Gem, KeyRound, Shuffle, Sparkles } from "lucide-react";
import { NftMintPanel } from "@/components/nft/nft-mint-panel";
import { NftWalletButton } from "@/components/nft/nft-wallet-button";
import { NIXIE_GENESIS_ADDRESS, NIXIE_UNISWAP_BUY_URL } from "@/lib/nft-collection";

export const metadata: Metadata = {
  title: "Nixie Genesis — Mint on Robinhood Chain",
  description: "Choose your temptation. Reveal one of twenty seductive Nixie Genesis characters using NIX.",
  openGraph: { images: ["/nft/genesis/14.jpg"] },
};

const contract = NIXIE_GENESIS_ADDRESS;
const openSeaUrl = "https://opensea.io/collection/nixiegenesis";

export default function NftPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08070b] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(215,255,0,.12),transparent_27%),radial-gradient(circle_at_85%_35%,rgba(207,84,255,.15),transparent_30%),linear-gradient(to_bottom,#08070b,#0c0911)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.035] [background-image:repeating-linear-gradient(115deg,transparent_0,transparent_38px,rgba(255,255,255,.8)_39px,transparent_40px)]" />

      <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2 text-sm font-black tracking-[-.03em]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7ff00] text-black">N</span>NIXIE</Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a href="#collection" className="hidden text-xs font-bold text-white/45 hover:text-white md:block">Collection</a>
          <a href={NIXIE_UNISWAP_BUY_URL} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-full bg-[#d7ff00] px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-black hover:brightness-110 sm:flex">Buy NIX <ExternalLink className="h-3 w-3" /></a>
          <a href={openSeaUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.04] px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/65 hover:border-[#d7ff00]/40 hover:text-[#d7ff00] sm:flex">OpenSea <ExternalLink className="h-3 w-3" /></a>
          <NftWalletButton />
        </nav>
      </header>

      <section className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-5 sm:px-8 lg:px-12 lg:pt-10">
        <div className="pointer-events-none absolute -right-20 top-[36rem] hidden rotate-90 text-[11rem] font-black leading-none tracking-[-.09em] text-white/[.018] xl:block">DESIRE</div>
        <div className="pointer-events-none absolute -left-16 top-[15rem] hidden -rotate-90 text-[10px] font-black uppercase tracking-[.8em] text-[#d7ff00]/20 xl:block">Private fantasies · minted after dark</div>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7ff00]/20 bg-[#d7ff00]/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.22em] text-[#d7ff00]"><Sparkles className="h-3 w-3" />20 temptations · 50 editions each · 18+</div>
            <h1 className="mt-6 max-w-4xl text-[clamp(4.4rem,11vw,9.5rem)] font-black leading-[.75] tracking-[-.085em]">MEET<br /><span className="relative text-[#d7ff00]">YOUR<span className="absolute -right-7 top-1 text-xl text-[#da7bff] sm:-right-10 sm:text-3xl">✦</span></span><br />NIXIE.</h1>
            <div className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <p className="max-w-xl text-base leading-7 text-white/55 sm:text-lg">Twenty seductive alter egos are waiting behind the velvet door. Choose how many you desire; the portal decides who comes home with you.</p>
              <a href="#mint" className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-5 py-3 text-xs font-black hover:border-[#d7ff00]/40 hover:text-[#d7ff00]">Choose your temptation <ArrowDown className="h-4 w-4" /></a>
            </div>

            <div className="relative mt-10 h-[440px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#121019] sm:h-[540px]">
              <Image src="/nft/genesis/14.jpg" alt="Nixie Genesis Lunar Bunny" fill priority sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover object-[center_32%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08070b] via-transparent to-black/10" />
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#d977ff]/10 to-transparent mix-blend-screen" />
              <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] backdrop-blur">Genesis portrait 14/20</div>
              <div className="absolute right-5 top-5 hidden text-right sm:block"><p className="text-[9px] font-black uppercase tracking-[.28em] text-white/45">Soft gaze</p><p className="mt-1 font-serif text-lg italic text-white/80">dangerous secrets</p></div>
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6 sm:p-8"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#d7ff00]">Lunar Bunny</p><p className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-5xl">She only comes out after dark.</p></div><div className="hidden h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/25 text-center text-[9px] font-black uppercase leading-4 backdrop-blur sm:flex">Instant<br />reveal</div></div>
            </div>
          </div>
          <div className="lg:sticky lg:top-5">
            <NftMintPanel />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="group relative col-span-2 h-64 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#15111a] xl:h-72">
                <Image src="/nft/genesis/09.jpg" alt="Neon Koi after dark" fill sizes="460px" className="object-cover object-[center_28%] opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-end p-6">
                  <p className="text-[9px] font-black uppercase tracking-[.28em] text-[#d7ff00]">Behind the velvet door</p>
                  <p className="mt-3 text-2xl font-black leading-[.95] tracking-[-.05em]">Her private room is waiting.</p>
                  <p className="mt-3 text-xs leading-5 text-white/50">Hold her NFT. Enter her world. What happens after that stays inside the museum.</p>
                </div>
              </div>
              <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10"><Image src="/nft/genesis/18.jpg" alt="Rose Remedy" fill sizes="220px" className="object-cover object-top opacity-70" /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" /><p className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-[.18em] text-[#d7ff00]">Sweet remedy</p></div>
              <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10"><Image src="/nft/genesis/19.jpg" alt="Amethyst Noir" fill sizes="220px" className="object-cover object-top opacity-70" /><div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" /><p className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-[.18em] text-[#d7ff00]">Dark appetite</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden border-y border-white/10 bg-[#d7ff00] py-3 text-black"><div className="whitespace-nowrap text-sm font-black uppercase tracking-[.24em] [animation:marquee_25s_linear_infinite]">CHOOSE YOUR TEMPTATION ✦ REVEAL HER INSTANTLY ✦ $5 IN NIX ✦ ENTER HER PRIVATE ROOM ✦ AFTER DARK ON ROBINHOOD CHAIN ✦ CHOOSE YOUR TEMPTATION ✦ REVEAL HER INSTANTLY ✦</div></div>

      <section className="relative mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-3 md:grid-cols-3">
          {[{ icon: Shuffle, number: "01", title: "Pick your temptation", text: "Choose 1, 2 or 3. No peeking — the live pool decides which Nixie answers your call." }, { icon: Gem, number: "02", title: "A five-dollar secret", text: "A signed live quote converts exactly five dollars into NIX for each seductive reveal." }, { icon: KeyRound, number: "03", title: "Claim her velvet key", text: "Reveal her in the same transaction, then follow her into a holder-only room inside the museum." }].map(({ icon: Icon, number, title, text }) => <div key={number} className="group rounded-[1.7rem] border border-white/10 bg-white/[.025] p-6 hover:-translate-y-1 hover:border-[#d7ff00]/25 hover:bg-[#d7ff00]/[.03]"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#d7ff00]" /><span className="text-xs font-black text-white/20">{number}</span></div><h2 className="mt-8 text-xl font-black tracking-[-.04em]">{title}</h2><p className="mt-3 text-sm leading-6 text-white/45">{text}</p></div>)}
        </div>
      </section>

      <section id="collection" className="relative overflow-hidden border-t border-white/10 bg-black/20 px-5 py-20 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(215,255,0,.08),transparent_42%)]" />
        <div className="mx-auto max-w-[1440px]">
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#d7ff00]"><EyeOff className="h-3.5 w-3.5" />The identities stay sealed</p><h2 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">Twenty secrets.<br />Meet yours at mint.</h2></div><div className="max-w-sm"><p className="text-sm leading-6 text-white/40">No gallery. No spoilers. Your Nixie reveals herself only after the transaction is confirmed.</p><a href={openSeaUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d7ff00]/25 bg-[#d7ff00]/[.07] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[#d7ff00] hover:bg-[#d7ff00] hover:text-black">View minted collection on OpenSea <ExternalLink className="h-3.5 w-3.5" /></a></div></div>
          <div className="relative mt-10 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 20 }, (_, index) => <div key={index} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/[.08] bg-[radial-gradient(circle_at_50%_35%,rgba(215,255,0,.11),transparent_32%),linear-gradient(145deg,#17131d,#0b0a0e)]"><div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(120deg,transparent_0,transparent_12px,rgba(255,255,255,.04)_13px,transparent_14px)]" /><div className="absolute inset-0 flex items-center justify-center text-[clamp(1rem,3vw,2.5rem)] font-black text-white/[.09] transition group-hover:text-[#d7ff00]/25">?</div><span className="absolute bottom-2 left-0 right-0 text-center text-[7px] font-black tracking-[.18em] text-white/20">SEALED</span></div>)}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-5 py-10 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 text-xs text-white/35 sm:flex-row sm:items-center"><p>© 2026 Nixie Genesis · 18+ digital art collection</p><div className="flex flex-wrap gap-4"><a href={openSeaUrl} target="_blank" rel="noreferrer" className="hover:text-[#d7ff00]">OpenSea</a><a href={`https://robinhoodchain.blockscout.com/address/${contract}`} target="_blank" rel="noreferrer" className="hover:text-[#d7ff00]">Verified contract</a><a href="https://dexscreener.com/robinhood/0x74a2e6bfc4507f68b4c98104722192597b71715a" target="_blank" rel="noreferrer" className="hover:text-[#d7ff00]">NIX market</a><Link href="/" className="hover:text-[#d7ff00]">Museum</Link></div></div></footer>
    </main>
  );
}
