import { createClient } from "./client";
import { createClient as createServerSupabase, createAdminClient } from "./server";
import { contentToArtwork } from "@/lib/types";
import type { ContentRow, StoryRow } from "@/lib/types";
import type { CommentDisplay } from "@/components/nixie/comments-panel";

export async function getContentWithCounts(wallet: string | string[] | undefined) {
  const admin = createAdminClient();
  const supabase = await createServerSupabase();

  const { data: contentRows, error: contentError } = await admin
    .from("content")
    .select("*")
    .order("created_at", { ascending: false });

  if (contentError || !contentRows?.length) {
    return { artworks: [], error: contentError };
  }

  const contentIds = (contentRows as ContentRow[]).map((c) => c.id);
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];

  // Unlock'ları service role ile oku: RLS yüzünden satın almış kullanıcılar kilitlenmesin (fiyat güncellense bile).
  const [unlocksRes, likesRes, commentsRes, viewsRes] = await Promise.all([
    wallets.length > 0
      ? admin.from("unlocks").select("content_id, unlock_type").in("wallet", wallets)
      : Promise.resolve({ data: [] as { content_id: string; unlock_type: string }[] }),
    supabase.from("likes").select("content_id, wallet").in("content_id", contentIds),
    supabase.from("comments").select("content_id").in("content_id", contentIds),
    supabase.from("content_views").select("content_id").in("content_id", contentIds),
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
  const viewerLikedIds = new Set(
    (likesRes.data ?? [])
      .filter((l) => wallets.length > 0 && wallets.includes(l.wallet))
      .map((l) => l.content_id)
  );
  const commentCountByContent: Record<string, number> = {};
  (commentsRes.data ?? []).forEach((c) => {
    commentCountByContent[c.content_id] =
      (commentCountByContent[c.content_id] ?? 0) + 1;
  });
  const viewCountByContent: Record<string, number> = {};
  (viewsRes.data ?? []).forEach((v) => {
    viewCountByContent[v.content_id] = (viewCountByContent[v.content_id] ?? 0) + 1;
  });

  const artworks = (contentRows as ContentRow[]).map((c) => {
    const priceUsdc = c.price_usdc ?? 0;
    const priceAnimated = (c as ContentRow & { price_animated_usdc?: number }).price_animated_usdc ?? 0;
    const nsfwUnlocked = priceUsdc === 0 || nsfwUnlockedIds.has(c.id);
    const animatedUnlocked = priceAnimated === 0 || animatedUnlockedIds.has(c.id);
    return contentToArtwork(c, {
      likes: likeCountByContent[c.id] ?? 0,
      views: viewCountByContent[c.id] ?? 0,
      comments: commentCountByContent[c.id] ?? 0,
      likedByViewer: viewerLikedIds.has(c.id),
      nsfwUnlocked,
      animatedUnlocked,
    });
  });

  return { artworks, error: null };
}

const TRENDING_DAYS = 7;
const TRENDING_LIMIT = 8;

/** Trending: content ordered by unlock count in last 7 days. */
export async function getTrendingArtworks(
  wallet: string | string[] | undefined,
  limit: number = TRENDING_LIMIT
): Promise<{ artworks: import("@/lib/types").Artwork[] }> {
  const admin = createAdminClient();
  const supabase = await createServerSupabase();
  const since = new Date();
  since.setDate(since.getDate() - TRENDING_DAYS);
  const sinceIso = since.toISOString();

  const { data: recentUnlocks } = await admin
    .from("unlocks")
    .select("content_id")
    .gte("created_at", sinceIso);

  const countByContent: Record<string, number> = {};
  (recentUnlocks ?? []).forEach((u) => {
    countByContent[u.content_id] = (countByContent[u.content_id] ?? 0) + 1;
  });
  const sortedIds = Object.entries(countByContent)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, limit);

  if (sortedIds.length === 0) {
    return { artworks: [] };
  }

  const { data: contentRows, error: contentError } = await admin
    .from("content")
    .select("*")
    .in("id", sortedIds);

  if (contentError || !contentRows?.length) {
    return { artworks: [] };
  }

  const order = new Map(sortedIds.map((id, i) => [id, i]));
  const rows = (contentRows as ContentRow[]).sort(
    (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)
  );
  const contentIds = rows.map((c) => c.id);
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];

  const [unlocksRes, likesRes, commentsRes, viewsRes] = await Promise.all([
    wallets.length > 0
      ? admin.from("unlocks").select("content_id, unlock_type").in("wallet", wallets).in("content_id", contentIds)
      : Promise.resolve({ data: [] as { content_id: string; unlock_type: string }[] }),
    supabase.from("likes").select("content_id, wallet").in("content_id", contentIds),
    supabase.from("comments").select("content_id").in("content_id", contentIds),
    supabase.from("content_views").select("content_id").in("content_id", contentIds),
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
  const viewerLikedIds = new Set(
    (likesRes.data ?? [])
      .filter((l) => wallets.length > 0 && wallets.includes(l.wallet))
      .map((l) => l.content_id)
  );
  const commentCountByContent: Record<string, number> = {};
  (commentsRes.data ?? []).forEach((c) => {
    commentCountByContent[c.content_id] = (commentCountByContent[c.content_id] ?? 0) + 1;
  });
  const viewCountByContent: Record<string, number> = {};
  (viewsRes.data ?? []).forEach((v) => {
    viewCountByContent[v.content_id] = (viewCountByContent[v.content_id] ?? 0) + 1;
  });

  const artworks = rows.map((c) => {
    const priceUsdc = c.price_usdc ?? 0;
    const priceAnimated = (c as ContentRow & { price_animated_usdc?: number }).price_animated_usdc ?? 0;
    const nsfwUnlocked = priceUsdc === 0 || nsfwUnlockedIds.has(c.id);
    const animatedUnlocked = priceAnimated === 0 || animatedUnlockedIds.has(c.id);
    return contentToArtwork(c, {
      likes: likeCountByContent[c.id] ?? 0,
      views: viewCountByContent[c.id] ?? 0,
      comments: commentCountByContent[c.id] ?? 0,
      likedByViewer: viewerLikedIds.has(c.id),
      nsfwUnlocked,
      animatedUnlocked,
    });
  });

  return { artworks };
}

/** Returns nsfw_cid only if at least one wallet may access (free content or has unlock). Otherwise null. */
export async function getNsfwCidIfAllowed(
  wallet: string | string[] | null,
  contentId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("content")
    .select("nsfw_cid, price_usdc")
    .eq("id", contentId)
    .single();
  if (error || !row?.nsfw_cid) return null;
  if (row.price_usdc === 0) return row.nsfw_cid;
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];
  if (wallets.length === 0) return null;
  const { data: unlocks } = await admin
    .from("unlocks")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("unlock_type", "nsfw")
    .in("wallet", wallets)
    .limit(1);
  return unlocks?.length ? row.nsfw_cid : null;
}

/** Returns animated_cid only if at least one wallet may access (free or has unlock). Otherwise null. */
export async function getAnimatedCidIfAllowed(
  wallet: string | string[] | null,
  contentId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("content")
    .select("animated_cid, price_animated_usdc")
    .eq("id", contentId)
    .single();
  if (error || !row?.animated_cid) return null;
  const priceAnimated = Number((row as { price_animated_usdc?: number }).price_animated_usdc ?? 0);
  if (priceAnimated === 0) return row.animated_cid;
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];
  if (wallets.length === 0) return null;
  const { data: unlocks } = await admin
    .from("unlocks")
    .select("content_id")
    .eq("content_id", contentId)
    .eq("unlock_type", "animated")
    .in("wallet", wallets)
    .limit(1);
  return unlocks?.length ? row.animated_cid : null;
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

export async function addContentView(
  contentId: string,
  viewerKey: string,
  eventType: "impression" | "click" = "impression"
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_views")
    .upsert(
      {
        content_id: contentId,
        viewer_key: viewerKey,
        event_type: eventType,
      },
      { onConflict: "content_id,viewer_key", ignoreDuplicates: true }
    );
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as StoryRow[];
}

export type StoryWithUnlock = StoryRow & { unlocked?: boolean };

export async function getActiveStoriesWithUnlock(
  wallet: string | string[] | undefined
): Promise<StoryWithUnlock[]> {
  const stories = await getActiveStories();
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];
  if (wallets.length === 0 || stories.length === 0) {
    return stories.map((s) => ({ ...s, unlocked: !s.is_paid }));
  }
  const admin = createAdminClient();
  const { data: unlocks } = await admin
    .from("story_unlocks")
    .select("story_id")
    .in("wallet", wallets);
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
  const admin = createAdminClient();
  const { data, error } = await admin
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

// ─── Koleksiyon listeleri ────────────────────────────────────────────────────

export type ListRow = { id: string; wallet: string; name: string; created_at: string };
export type ListItemRow = { list_id: string; content_id: string; created_at: string };

export async function createList(wallet: string, name: string): Promise<{ data: ListRow | null; error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lists")
    .insert({ wallet, name: name.trim() || "New list" })
    .select("id, wallet, name, created_at")
    .single();
  return { data: data as ListRow | null, error: error ? { message: error.message } : null };
}

export async function getListsByWallet(wallet: string): Promise<ListRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("lists")
    .select("id, wallet, name, created_at")
    .eq("wallet", wallet)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ListRow[];
}

export async function addListItem(listId: string, contentId: string, wallet: string): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: list } = await supabase.from("lists").select("wallet").eq("id", listId).single();
  if (!list || (list as { wallet: string }).wallet !== wallet) {
    return { error: { message: "List not found or access denied" } };
  }
  const { error } = await supabase.from("list_items").upsert(
    { list_id: listId, content_id: contentId },
    { onConflict: "list_id,content_id" }
  );
  return { error: error ? { message: error.message } : null };
}

export async function removeListItem(listId: string, contentId: string, wallet: string): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: list } = await supabase.from("lists").select("wallet").eq("id", listId).single();
  if (!list || (list as { wallet: string }).wallet !== wallet) {
    return { error: { message: "List not found or access denied" } };
  }
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("content_id", contentId);
  return { error: error ? { message: error.message } : null };
}

export async function getListWithArtworks(
  listId: string,
  wallet: string | string[] | undefined
): Promise<{ list: ListRow | null; artworks: import("@/lib/types").Artwork[] }> {
  const supabase = await createServerSupabase();
  const admin = createAdminClient();
  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("id, wallet, name, created_at")
    .eq("id", listId)
    .single();
  if (listError || !list) return { list: null, artworks: [] };
  const listRow = list as ListRow;
  const { data: items } = await supabase
    .from("list_items")
    .select("content_id")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });
  const contentIds = (items ?? []).map((i) => (i as { content_id: string }).content_id);
  if (contentIds.length === 0) return { list: listRow, artworks: [] };
  const { data: contentRows, error: contentError } = await admin
    .from("content")
    .select("*")
    .in("id", contentIds);
  if (contentError || !contentRows?.length) return { list: listRow, artworks: [] };
  const order = new Map(contentIds.map((id, i) => [id, i]));
  const rows = (contentRows as ContentRow[]).sort(
    (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)
  );
  const wallets = wallet == null ? [] : Array.isArray(wallet) ? wallet : [wallet];
  const [unlocksRes, likesRes, commentsRes, viewsRes] = await Promise.all([
    wallets.length > 0
      ? admin.from("unlocks").select("content_id, unlock_type").in("wallet", wallets).in("content_id", contentIds)
      : Promise.resolve({ data: [] as { content_id: string; unlock_type: string }[] }),
    supabase.from("likes").select("content_id, wallet").in("content_id", contentIds),
    supabase.from("comments").select("content_id").in("content_id", contentIds),
    supabase.from("content_views").select("content_id").in("content_id", contentIds),
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
  const viewerLikedIds = new Set(
    (likesRes.data ?? [])
      .filter((l) => wallets.length > 0 && wallets.includes(l.wallet))
      .map((l) => l.content_id)
  );
  const commentCountByContent: Record<string, number> = {};
  (commentsRes.data ?? []).forEach((c) => {
    commentCountByContent[c.content_id] = (commentCountByContent[c.content_id] ?? 0) + 1;
  });
  const viewCountByContent: Record<string, number> = {};
  (viewsRes.data ?? []).forEach((v) => {
    viewCountByContent[v.content_id] = (viewCountByContent[v.content_id] ?? 0) + 1;
  });
  const artworks = rows.map((c) => {
    const priceUsdc = c.price_usdc ?? 0;
    const priceAnimated = (c as ContentRow & { price_animated_usdc?: number }).price_animated_usdc ?? 0;
    const nsfwUnlocked = priceUsdc === 0 || nsfwUnlockedIds.has(c.id);
    const animatedUnlocked = priceAnimated === 0 || animatedUnlockedIds.has(c.id);
    return contentToArtwork(c, {
      likes: likeCountByContent[c.id] ?? 0,
      views: viewCountByContent[c.id] ?? 0,
      comments: commentCountByContent[c.id] ?? 0,
      likedByViewer: viewerLikedIds.has(c.id),
      nsfwUnlocked,
      animatedUnlocked,
    });
  });
  return { list: listRow, artworks };
}

export async function getListItemsContentIds(listId: string): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("list_items").select("content_id").eq("list_id", listId);
  return (data ?? []).map((i) => (i as { content_id: string }).content_id);
}

export async function deleteList(listId: string, wallet: string): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: list } = await supabase.from("lists").select("wallet").eq("id", listId).single();
  if (!list || (list as { wallet: string }).wallet !== wallet) {
    return { error: { message: "List not found or access denied" } };
  }
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  return { error: error ? { message: error.message } : null };
}

// ─── DMs (Message Nixie): only admin sees all; user sees only own thread ─────

export type DmThreadRow = { id: string; user_wallet: string; created_at: string; updated_at: string };
export type DmMessageRow = { id: string; thread_id: string; sender_type: "user" | "admin"; body: string; created_at: string };

/** Get or create the single thread for this wallet. Returns thread + messages. */
export async function getOrCreateDmThread(wallet: string): Promise<{
  thread: DmThreadRow | null;
  messages: DmMessageRow[];
  error: { message: string } | null;
}> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("dm_threads")
    .select("id, user_wallet, created_at, updated_at")
    .eq("user_wallet", wallet)
    .maybeSingle();
  if (existing) {
    const { data: messages, error: msgErr } = await admin
      .from("dm_messages")
      .select("id, thread_id, sender_type, body, created_at")
      .eq("thread_id", existing.id)
      .order("created_at", { ascending: true });
    return {
      thread: existing as DmThreadRow,
      messages: (messages ?? []) as DmMessageRow[],
      error: msgErr ? { message: msgErr.message } : null,
    };
  }
  const { data: inserted, error: insertErr } = await admin
    .from("dm_threads")
    .insert({ user_wallet: wallet })
    .select("id, user_wallet, created_at, updated_at")
    .single();
  if (insertErr || !inserted) {
    return { thread: null, messages: [], error: insertErr ? { message: insertErr.message } : { message: "Failed to create thread" } };
  }
  return { thread: inserted as DmThreadRow, messages: [], error: null };
}

/** User sends a message to their thread. Wallet must own the thread. */
export async function addDmUserMessage(threadId: string, wallet: string, body: string): Promise<{ error: { message: string } | null }> {
  const admin = createAdminClient();
  const { data: thread } = await admin.from("dm_threads").select("user_wallet").eq("id", threadId).single();
  if (!thread || (thread as { user_wallet: string }).user_wallet !== wallet) {
    return { error: { message: "Thread not found or access denied" } };
  }
  const { error } = await admin.from("dm_messages").insert({ thread_id: threadId, sender_type: "user", body: body.trim() });
  return { error: error ? { message: error.message } : null };
}

/** Admin: list all threads (by updated_at desc). */
export async function getDmThreadsForAdmin(): Promise<(DmThreadRow & { last_message?: string; message_count?: number })[]> {
  const admin = createAdminClient();
  const { data: threads, error } = await admin
    .from("dm_threads")
    .select("id, user_wallet, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !threads?.length) return [];
  const threadIds = (threads as DmThreadRow[]).map((t) => t.id);
  const { data: allMessages } = await admin
    .from("dm_messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });
  const countByThread: Record<string, number> = {};
  const lastByThread: Record<string, string> = {};
  (allMessages ?? []).forEach((r) => {
    const tid = (r as { thread_id: string; body: string }).thread_id;
    countByThread[tid] = (countByThread[tid] ?? 0) + 1;
    if (lastByThread[tid] === undefined) lastByThread[tid] = (r as { body: string }).body;
  });
  return (threads as DmThreadRow[]).map((t) => ({
    ...t,
    last_message: lastByThread[t.id] ?? "",
    message_count: countByThread[t.id] ?? 0,
  }));
}

/** Admin: get messages in a thread. */
export async function getDmMessagesForAdmin(threadId: string): Promise<DmMessageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dm_messages")
    .select("id, thread_id, sender_type, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as DmMessageRow[];
}

/** Admin: get thread by id (for wallet display). */
export async function getDmThreadForAdmin(threadId: string): Promise<DmThreadRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("dm_threads").select("id, user_wallet, created_at, updated_at").eq("id", threadId).single();
  if (error || !data) return null;
  return data as DmThreadRow;
}

/** Admin: reply to a thread. */
export async function addDmAdminReply(threadId: string, body: string): Promise<{ error: { message: string } | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from("dm_messages").insert({ thread_id: threadId, sender_type: "admin", body: body.trim() });
  return { error: error ? { message: error.message } : null };
}
