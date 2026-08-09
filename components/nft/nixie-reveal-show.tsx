"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, Sparkles, X } from "lucide-react";
import { nixieName } from "@/lib/nft-collection";
import { NixieShareCard } from "@/components/nft/nixie-share-card";

type Props = {
  open: boolean;
  tokenIds: number[];
  transactionHash?: `0x${string}`;
  onClose: () => void;
};

const particles = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  delay: `${(index % 8) * 0.18}s`,
  size: `${3 + (index % 4) * 2}px`,
}));

export function NixieRevealShow({ open, tokenIds, transactionHash, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [summary, setSummary] = useState(false);
  const [cardSettled, setCardSettled] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setSummary(false);
    setCardSettled(false);
  }, [open, tokenIds]);

  useEffect(() => {
    if (!open || summary) return;
    setCardSettled(false);
    const timer = window.setTimeout(() => setCardSettled(true), 3_400);
    return () => window.clearTimeout(timer);
  }, [activeIndex, open, summary]);

  useEffect(() => {
    if (!open || summary || !cardSettled || tokenIds.length < 2 || activeIndex >= tokenIds.length - 1) return;
    const timer = window.setTimeout(() => setActiveIndex((current) => current + 1), 5_500);
    return () => window.clearTimeout(timer);
  }, [activeIndex, cardSettled, open, summary, tokenIds.length]);

  if (!open || tokenIds.length === 0) return null;

  const tokenId = tokenIds[activeIndex];
  const isLast = activeIndex === tokenIds.length - 1;
  const next = () => {
    if (!isLast) setActiveIndex((current) => current + 1);
    else if (tokenIds.length > 1) setSummary(true);
    else onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Nixie reveal" className="fixed inset-0 z-[120] overflow-y-auto bg-[#050407]/95 text-white backdrop-blur-2xl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <Image src={`/nft/genesis/${String(tokenId).padStart(2, "0")}.jpg`} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-15 blur-3xl transition duration-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(215,255,0,.14),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(210,91,255,.18),transparent_35%),linear-gradient(to_bottom,rgba(5,4,7,.2),#050407)]" />
        {particles.map((particle, index) => <span key={index} className="nixie-reveal-particle absolute rounded-full bg-[#d7ff00] shadow-[0_0_12px_#d7ff00]" style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size, animationDelay: particle.delay }} />)}
      </div>

      <button type="button" onClick={onClose} aria-label="Close reveal" className="fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 backdrop-blur hover:border-white/40 hover:text-white"><X className="h-5 w-5" /></button>

      {!summary ? (
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-16 lg:grid lg:grid-cols-[minmax(300px,480px)_1fr] lg:gap-16 lg:px-10">
          <div key={`card-${activeIndex}-${tokenId}`} className="nixie-reveal-card relative aspect-[3/4] w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-[#d7ff00]/45 bg-[#17121d] shadow-[0_0_0_1px_rgba(255,255,255,.08),0_0_90px_rgba(215,255,0,.18),0_40px_100px_rgba(0,0,0,.7)]">
            <Image src={`/nft/genesis/${String(tokenId).padStart(2, "0")}.jpg`} alt={`Nixie — ${nixieName(tokenId)}`} fill priority sizes="(max-width: 1024px) 90vw, 480px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/10" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/45 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] backdrop-blur">Genesis #{String(tokenId).padStart(2, "0")}</div>
            <div className="absolute inset-x-0 bottom-0 p-5 pt-20 sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#d7ff00]">She answered your call</p><h2 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">{nixieName(tokenId)}</h2></div>
          </div>

          {!cardSettled ? (
            <div className="mt-9 max-w-xl text-center lg:mt-0 lg:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.35em] text-[#d7ff00]">The portal is choosing</p>
              <h1 className="mt-5 text-5xl font-black leading-[.86] tracking-[-.07em] text-white/15 sm:text-7xl lg:text-8xl">WHO<br />ANSWERED<br />YOUR CALL?</h1>
              <div className="mt-7 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10"><span className="nixie-reveal-progress block h-full rounded-full bg-[#d7ff00] shadow-[0_0_18px_#d7ff00]" /></div>
            </div>
          ) : <div key={`copy-${activeIndex}-${tokenId}`} className="nixie-reveal-copy mt-9 max-w-xl text-center lg:mt-0 lg:text-left">
            <p className="text-[10px] font-black uppercase tracking-[.35em] text-[#d7ff00]">Reveal {activeIndex + 1} of {tokenIds.length}</p>
            <h1 className="mt-5 text-5xl font-black leading-[.86] tracking-[-.07em] sm:text-7xl lg:text-8xl">SHE<br /><span className="text-[#d7ff00]">CHOSE</span><br />YOU.</h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/55 sm:text-base">{nixieName(tokenId)} is now yours. Her private room, her secrets and her place inside the Nixie Museum follow this NFT.</p>

            <div className="mt-7 flex items-center justify-center gap-2 lg:justify-start">{tokenIds.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all duration-500 ${index === activeIndex ? "w-10 bg-[#d7ff00]" : index < activeIndex ? "w-4 bg-white/50" : "w-4 bg-white/15"}`} />)}</div>

            <NixieShareCard tokenId={tokenId} />

            <button type="button" onClick={next} className="mt-7 inline-flex min-w-56 items-center justify-center gap-2 rounded-full bg-[#d7ff00] px-6 py-4 text-sm font-black text-black shadow-[0_16px_50px_rgba(215,255,0,.16)] hover:-translate-y-0.5 hover:brightness-110">{!isLast ? "Reveal the next Nixie" : tokenIds.length > 1 ? "See everyone you revealed" : "Keep her close"}<ChevronRight className="h-4 w-4" /></button>
            {!isLast && <p className="mt-3 text-[10px] text-white/30">Take a look — the next card arrives in a few seconds, or continue now.</p>}
          </div>}
        </div>
      ) : (
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-20">
          <Sparkles className="h-7 w-7 text-[#d7ff00]" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.35em] text-[#d7ff00]">Your complete reveal</p>
          <h1 className="mt-4 text-center text-5xl font-black tracking-[-.065em] sm:text-7xl">THEY&apos;RE ALL YOURS.</h1>
          <div className={`mt-10 grid w-full max-w-4xl gap-3 ${tokenIds.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {tokenIds.map((id, index) => <div key={`${id}-${index}`} className="nixie-summary-card relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/15" style={{ animationDelay: `${index * 0.18}s` }}><Image src={`/nft/genesis/${String(id).padStart(2, "0")}.jpg`} alt={nixieName(id)} fill sizes="33vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-3 sm:p-5"><p className="text-xs font-black sm:text-lg">{nixieName(id)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.16em] text-[#d7ff00] sm:text-[10px]">Genesis #{String(id).padStart(2, "0")}</p></div></div>)}
          </div>
          <div className={`mt-5 grid w-full max-w-4xl gap-3 ${tokenIds.length === 1 ? "grid-cols-1" : tokenIds.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {tokenIds.map((id, index) => (
              <NixieShareCard key={`share-${id}-${index}`} tokenId={id} variant="compact" />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={onClose} className="rounded-full bg-[#d7ff00] px-7 py-4 text-sm font-black text-black hover:brightness-110">Return to the portal</button>{transactionHash && <a href={`https://robinhoodchain.blockscout.com/tx/${transactionHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-white/15 px-6 py-4 text-sm font-black text-white/65 hover:border-white/35 hover:text-white">View transaction <ExternalLink className="h-4 w-4" /></a>}</div>
        </div>
      )}
    </div>
  );
}
