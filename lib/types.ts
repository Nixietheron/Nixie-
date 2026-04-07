export interface ContentRow {
  id: string;
  title: string;
  description: string | null;
  sfw_cid: string | null;
  nsfw_cid: string | null;
  animated_cid: string | null;
  price_usdc: number;
  price_animated_usdc: number;
  created_at: string;
}

export interface Artwork {
  id: string;
  title: string;
  description: string | null;
  sfwPreview: string;
  /** NSFW image URL when unlocked or free; empty when locked (use hasNsfw to show tab) */
  nsfwFull: string;
  /** Whether this content has NSFW media (so we show the NSFW tab even when locked) */
  hasNsfw: boolean;
  /** Whether this content has animated media (so we show the Animated tab even when locked) */
  hasAnimated: boolean;
  /** Animated media URL only when free or unlocked; undefined when paid and locked */
  animatedVersion?: string;
  /** NSFW unlock price (USDC) */
  price: number;
  /** Animated unlock price (USDC) */
  animatedPrice: number;
  likes: number;
  views: number;
  comments: number;
  creator: string;
  /** NSFW unlocked for this wallet (or free) */
  nsfwUnlocked?: boolean;
  /** Animated unlocked for this wallet (or free) */
  animatedUnlocked?: boolean;
  /** True if either NSFW or Animated is unlocked (including free content) */
  isUnlocked?: boolean;
  /** True only when this wallet has actually paid for at least one locked media (NSFW or Animated). */
  hasPaidUnlock?: boolean;
  createdAt: string;
}

export interface CommentRow {
  id: string;
  artworkId: string;
  wallet: string;
  text: string;
  created_at: string;
}

export interface StoryRow {
  id: string;
  image_cid: string;
  nsfw_cid: string | null;
  animated_cid: string | null;
  is_paid: boolean;
  price_usdc: number;
  duration_hours: number;
  expires_at: string;
  created_at: string;
}

import { ipfsUrl } from "@/lib/constants";

/** NSFW image URL: only exposed when unlocked or free; otherwise empty (no CID leak). */
function nsfwImageUrl(contentId: string, nsfwUnlocked: boolean, priceUsdc: number): string {
  if (nsfwUnlocked || priceUsdc === 0) return `/api/ipfs-image?contentId=${contentId}`;
  return "";
}

export function contentToArtwork(
  c: ContentRow,
  opts: {
    likes: number;
    views?: number;
    comments: number;
    nsfwUnlocked?: boolean;
    animatedUnlocked?: boolean;
  }
): Artwork {
  const row = c as ContentRow & { nsfwCid?: string | null; sfwCid?: string | null };
  const sfwCid = row.sfw_cid ?? row.sfwCid ?? null;
  const nsfwCid = row.nsfw_cid ?? (row as { nsfwCid?: string | null }).nsfwCid ?? null;
  const nsfwUnlocked = opts.nsfwUnlocked ?? false;
  const animatedUnlocked = opts.animatedUnlocked ?? false;
  const priceAnimated = (c as ContentRow & { price_animated_usdc?: number }).price_animated_usdc ?? 0;
  const animatedAllowed = !!c.animated_cid && (animatedUnlocked || priceAnimated === 0);
  const hasPaidUnlock =
    (c.price_usdc > 0 && nsfwUnlocked) || (priceAnimated > 0 && animatedUnlocked);
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    sfwPreview: sfwCid ? ipfsUrl(sfwCid) : "",
    nsfwFull: nsfwCid ? nsfwImageUrl(c.id, nsfwUnlocked, c.price_usdc) : "",
    hasNsfw: !!nsfwCid,
    hasAnimated: !!c.animated_cid,
    /** Proxy URL; client must append &wallet= when loading. Never expose raw CID. */
    animatedVersion: animatedAllowed ? `/api/ipfs-image?contentId=${c.id}&type=animated` : undefined,
    price: c.price_usdc,
    animatedPrice: priceAnimated,
    likes: opts.likes,
    views: opts.views ?? 0,
    comments: opts.comments,
    creator: "Nixie",
    nsfwUnlocked,
    animatedUnlocked,
    isUnlocked: nsfwUnlocked || animatedUnlocked,
    hasPaidUnlock,
    createdAt: c.created_at,
  };
}
