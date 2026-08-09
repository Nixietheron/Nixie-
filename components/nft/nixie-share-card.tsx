"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { NIXIE_MINT_URL, NIXIE_OPENSEA_URL, nixieName } from "@/lib/nft-collection";

type Props = {
  tokenId: number;
  variant?: "reveal" | "compact";
};

const CARD_WIDTH = 1600;
const CARD_HEIGHT = 900;

function imagePath(tokenId: number) {
  return `/nft/genesis/${String(tokenId).padStart(2, "0")}.jpg`;
}

function filenameFor(name: string) {
  return `nixie-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-share-card.png`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
    if (index === words.length - 1 && line) ctx.fillText(line, x, y);
  });
  return y;
}

async function loadImage(src: string) {
  const image = new window.Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  return image;
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = sourceHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = sourceWidth / targetRatio;
    sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * 0.28);
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

export function NixieShareCard({ tokenId, variant = "reveal" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = nixieName(tokenId);
  const imageSrc = imagePath(tokenId);
  const shareText = useMemo(
    () => `I summoned ${name} from NIXIE: Forbidden Genesis.\n\n50 editions · Robinhood Chain · Instant reveal\n\nMint yours: ${NIXIE_MINT_URL}`,
    [name],
  );
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const renderCard = useCallback(async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setReady(false);
    const image = await loadImage(imageSrc);
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bg.addColorStop(0, "#050407");
    bg.addColorStop(0.48, "#09070f");
    bg.addColorStop(1, "#261031");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#d7ff00";
    ctx.lineWidth = 2;
    for (let x = -CARD_HEIGHT; x < CARD_WIDTH; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, CARD_HEIGHT);
      ctx.lineTo(x + CARD_HEIGHT * 0.72, 0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(844, 60, 690, 780, 54);
    ctx.clip();
    drawCover(ctx, image, 844, 60, 690, 780);
    const fade = ctx.createLinearGradient(844, 60, 1050, 60);
    fade.addColorStop(0, "rgba(5,4,7,0.96)");
    fade.addColorStop(0.45, "rgba(5,4,7,0.18)");
    fade.addColorStop(1, "rgba(5,4,7,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(844, 60, 690, 780);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(215,255,0,0.65)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(844, 60, 690, 780, 54);
    ctx.stroke();
    ctx.restore();

    const glow = ctx.createRadialGradient(540, 470, 0, 540, 470, 530);
    glow.addColorStop(0, "rgba(215,255,0,0.18)");
    glow.addColorStop(0.44, "rgba(215,255,0,0.07)");
    glow.addColorStop(1, "rgba(215,255,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.fillStyle = "#d7ff00";
    ctx.font = "900 28px Arial, sans-serif";
    ctx.letterSpacing = "10px";
    ctx.fillText("NIXIE: FORBIDDEN GENESIS", 86, 100);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 92px Arial, sans-serif";
    wrapText(ctx, `I summoned ${name}`, 82, 230, 720, 96);

    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.font = "500 34px Arial, sans-serif";
    wrapText(ctx, "from NIXIE: Forbidden Genesis", 86, 440, 690, 44);

    ctx.fillStyle = "#d7ff00";
    ctx.font = "900 34px Arial, sans-serif";
    ctx.fillText("50 EDITIONS", 86, 570);
    ctx.fillText("ROBINHOOD CHAIN", 86, 622);
    ctx.fillText("INSTANT REVEAL", 86, 674);

    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.font = "700 28px Arial, sans-serif";
    ctx.fillText(NIXIE_OPENSEA_URL.replace("https://", ""), 86, 760);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 40px Arial, sans-serif";
    ctx.fillText("MINT YOURS · NIXIEPINK.COM/NFT", 86, 816);

    ctx.fillStyle = "#d7ff00";
    ctx.beginPath();
    ctx.arc(1440, 742, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050407";
    ctx.font = "900 56px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 1440, 742);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    setReady(true);
  }, [imageSrc, name]);

  useEffect(() => {
    void renderCard();
  }, [renderCard]);

  const canvasToBlob = async () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Share card is not ready yet.");
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Share card could not be created."))), "image/png", 0.98);
    });
  };

  const downloadCard = async () => {
    setBusy(true);
    try {
      const blob = await canvasToBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFor(name);
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const copyCard = async () => {
    setBusy(true);
    try {
      const blob = await canvasToBlob();
      if ("ClipboardItem" in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={variant === "compact" ? "mt-4 rounded-2xl border border-[#d7ff00]/20 bg-black/25 p-3" : "mt-7 rounded-[1.4rem] border border-[#d7ff00]/25 bg-[#d7ff00]/[.055] p-3"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#d7ff00]">Summon card</p>
          <p className="mt-1 text-xs text-white/45">Download it, attach it to X, and let the portal spread.</p>
        </div>
        {ready && <span className="rounded-full border border-[#d7ff00]/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-[#d7ff00]">Ready</span>}
      </div>
      <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/35">
        <Image src={imageSrc} alt="" fill sizes="420px" className="object-cover opacity-45 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 p-4">
          <p className="text-[8px] font-black uppercase tracking-[.28em] text-[#d7ff00]">NIXIE: Forbidden Genesis</p>
          <p className="mt-6 max-w-[65%] text-2xl font-black leading-[.9] tracking-[-.06em] sm:text-3xl">I summoned<br />{name}</p>
          <p className="absolute bottom-4 left-4 text-[9px] font-black uppercase tracking-[.16em] text-white/55">50 editions · Robinhood Chain</p>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={xShareUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#d7ff00] px-3 py-3 text-[9px] font-black uppercase tracking-wider text-black hover:brightness-110">
          <Share2 className="h-3.5 w-3.5" /> Share X
        </a>
        <button type="button" disabled={!ready || busy} onClick={downloadCard} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-[9px] font-black uppercase tracking-wider text-white/70 hover:border-[#d7ff00]/35 hover:text-[#d7ff00] disabled:opacity-40">
          <Download className="h-3.5 w-3.5" /> PNG
        </button>
        <button type="button" disabled={!ready || busy} onClick={copyCard} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-[9px] font-black uppercase tracking-wider text-white/70 hover:border-[#d7ff00]/35 hover:text-[#d7ff00] disabled:opacity-40">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a href={NIXIE_OPENSEA_URL} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-[#d7ff00]/20 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-[#d7ff00] hover:bg-[#d7ff00] hover:text-black">
        OpenSea collection <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
