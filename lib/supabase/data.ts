import { createClient } from "./client";
import { createClient as createServerSupabase, createAdminClient } from "./server";
import { contentToArtwork } from "@/lib/types";
import type { ContentRow, StoryRow } from "@/lib/types";
import type { CommentDisplay } from "@/components/nixie/comments-panel";

export async function getContentWithCounts(wallet: string | undefined) {
  const supabase = await createServerSupabase();

  const { data: contentRows, error: contentError } = await supabase
    .from("content")
    .select("*")
    .order("created_at", { ascending: false });

  if (contentError || !contentRows?.length) {
    return { artworks: [], error: contentError };
  }

  const contentIds = (contentRows as ContentRow[]).map((c) => c.id);

  const [unlocksRes, likesRes, commentsRes] = await Promise.all([
    wallet
      ? supabase.from("unlocks").select("content_id, unlock_type").eq("wallet", wallet)
      : Promise.resolve({ data: [] as { content_id: string; unlock_type: string }[] }),
    supabase.from("likes").select("content_id").in("content_id", contentIds),
    supabase.from("comments").select("content_id").in("content_id", contentIds),
  ]);

  const nsfwUnlockedIds = new Set(
    (unlocksRes.data ?? []).filter((u) => u.unlock_type === "nsfw").map((u) => u.content_id)
  );
  const animatedUnlockedIds = new Set(
    (unlocksRes.data ?? []).filter((u) => u.unlock_type === "animated").map((u) => u.content_id)
  );

  const likeCountByContent: Record<string, number> = {};
  (likesRes.data ?? []).forEach((l) => {
    likeCountByContent[l.content_id] = (likeCountByContent[l.content_id] ?? 0) + 1;
  });
  const commentCountByContent: Record<string, number> = {};
  (commentsRes.data ?? []).forEach((c) => {
    commentCountByContent[c.content_id] =
      (commentCountByContent[c.content_id] ?? 0) + 1;
  });

  const artworks = (contentRows as ContentRow[]).map((c) => {
    const priceUsdc = c.price_usdc ?? 0;
    const priceAnimated = (c as ContentRow & { price_animated_usdc?: number }).price_animated_usdc ?? 0;
    const nsfwUnlocked = priceUsdc === 0 || nsfwUnlockedIds.has(c.id);
    const animatedUnlocked = priceAnimated === 0 || animatedUnlockedIds.has(c.id);
    return contentToArtwork(c, {
      likes: likeCountByContent[c.id] ?? 0,
      comments: commentCountByContent[c.id] ?? 0,
      nsfwUnlocked,
      animatedUnlocked,
    });
  });

  return { artworks, error: null };
}

/** Returns nsfw_cid only if wallet may access (free content or has unlock). Otherwise null. */
export async function getNsfwCidIfAllowed(
  wallet: string | null,
  contentId: string
): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("content")
    .select("nsfw_cid, price_usdc")
    .eq("id", contentId)
    .single();
  if (error || !row?.nsfw_cid) return null;
  if (row.price_usdc === 0) return row.nsfw_cid;
  if (!wallet) return null;
  const { data: unlock } = await supabase
    .from("unlocks")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("wallet", wallet)
    .eq("unlock_type", "nsfw")
    .maybeSingle();
  return unlock ? row.nsfw_cid : null;
}

/** Returns animated_cid only if wallet may access (free or has unlock). Otherwise null. */
export async function getAnimatedCidIfAllowed(
  wallet: string | null,
  contentId: string
): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("content")
    .select("animated_cid, price_animated_usdc")
    .eq("id", contentId)
    .single();
  if (error || !row?.animated_cid) return null;
  const priceAnimated = Number((row as { price_animated_usdc?: number }).price_animated_usdc ?? 0);
  if (priceAnimated === 0) return row.animated_cid;
  if (!wallet) return null;
  const { data: unlock } = await supabase
    .from("unlocks")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("wallet", wallet)
    .eq("unlock_type", "animated")
    .maybeSingle();
  return unlock ? row.animated_cid : null;
}

export async function getCommentsByContentId(
  contentId: string
): Promise<CommentDisplay[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("comments")
    .select("id, wallet, text, created_at")
    .eq("content_id", contentId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    wallet: r.wallet,
    text: r.text,
    created_at: r.created_at,
  }));
}

export type UnlockType = "nsfw" | "animated";

export async function unlockContent(
  wallet: string,
  contentId: string,
  unlockType: UnlockType,
  txHash?: string
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("unlocks").insert({
    wallet,
    content_id: contentId,
    unlock_type: unlockType,
    tx_hash: txHash ?? null,
  });
  return { error };
}

export async function likeContent(wallet: string, contentId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("likes").upsert(
    { wallet, content_id: contentId },
    { onConflict: "wallet,content_id" }
  );
  return { error };
}

export async function unlikeContent(wallet: string, contentId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("wallet", wallet)
    .eq("content_id", contentId);
  return { error };
}

export async function getCommentCountByWallet(
  wallet: string,
  contentId: string
): Promise<number> {
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet)
    .eq("content_id", contentId);
  return count ?? 0;
}

export async function addComment(
  wallet: string,
  contentId: string,
  text: string
) {
  const supabase = createAdminClient();

  // Enforce max 3 comments per wallet per content
  const existing = await getCommentCountByWallet(wallet, contentId);
  if (existing >= 3) {
    return {
      comment: null,
      error: { message: "You can post at most 3 comments per artwork." },
    };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ wallet, content_id: contentId, text })
    .select("id, wallet, text, created_at")
    .single();
  if (error) {
    const msg = error.message.includes("comment_limit_exceeded")
      ? "You can post at most 3 comments per artwork."
      : error.message;
    return { comment: null, error: { message: msg } };
  }
  return {
    comment: {
      id: data.id,
      wallet: data.wallet,
      text: data.text,
      created_at: data.created_at,
    } as CommentDisplay,
    error: null,
  };
}

// ─── Admin: content list, update, delete ───────────────────────────────────

export async function getContentListForAdmin(): Promise<ContentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ContentRow[];
}

export async function updateContent(
  id: string,
  updates: Partial<Pick<ContentRow, "title" | "description" | "price_usdc" | "price_animated_usdc" | "sfw_cid" | "nsfw_cid" | "animated_cid">>
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("content").update(updates).eq("id", id);
  return { error };
}

export async function deleteContent(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("content").delete().eq("id", id);
  return { error };
}

// ─── Stories ────────────────────────────────────────────────────────────────

export async function getActiveStories(): Promise<StoryRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as StoryRow[];
}

export type StoryWithUnlock = StoryRow & { unlocked?: boolean };

export async function getActiveStoriesWithUnlock(
  wallet: string | undefined
): Promise<StoryWithUnlock[]> {
  const stories = await getActiveStories();
  if (!wallet || stories.length === 0) {
    return stories.map((s) => ({ ...s, unlocked: !s.is_paid }));
  }
  const supabase = await createServerSupabase();
  const { data: unlocks } = await supabase
    .from("story_unlocks")
    .select("story_id")
    .eq("wallet", wallet);
  const unlockedSet = new Set((unlocks ?? []).map((u) => u.story_id));
  return stories.map((s) => ({
    ...s,
    unlocked: !s.is_paid || unlockedSet.has(s.id),
  }));
}

export async function createStory(params: {
  image_cid: string;
  nsfw_cid?: string | null;
  animated_cid?: string | null;
  is_paid: boolean;
  price_usdc: number;
  duration_hours: number;
}) {
  const supabase = createAdminClient();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + params.duration_hours);
  const { data, error } = await supabase
    .from("stories")
    .insert({
      image_cid: params.image_cid,
      nsfw_cid: params.nsfw_cid ?? null,
      animated_cid: params.animated_cid ?? null,
      is_paid: params.is_paid,
      price_usdc: params.price_usdc,
      duration_hours: params.duration_hours,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  return { data, error };
}

export async function getStoriesForAdmin() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as StoryRow[];
}

export async function deleteStory(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  return { error };
}
