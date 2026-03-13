"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NixieButton } from "@/components/nixie";
import { createClient } from "@/lib/supabase/client";
import { ipfsUrl } from "@/lib/constants";
import {
  Upload,
  Check,
  Loader2,
  Pencil,
  Trash2,
  Image as ImageIcon,
  FileText,
  Clock,
} from "lucide-react";
import type { ContentRow, StoryRow } from "@/lib/types";

type FreeFlags = { sfw: boolean; nsfw: boolean; animated: boolean };
type Tab = "publish" | "content" | "stories";

function UploadZone({
  label,
  accept,
  cid,
  isUploading,
  isFree,
  required,
  onFile,
  onFreeToggle,
  onRemove,
}: {
  label: string;
  accept: string;
  cid: string;
  isUploading: boolean;
  isFree: boolean;
  required?: boolean;
  onFile: (f: File) => void;
  onFreeToggle: (v: boolean) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/25 shadow-lg shadow-black/20">
      <div className="bg-black/70 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/90">{label}</span>
          {required && (
            <span className="text-[10px] text-anime-pink bg-white/15 px-1.5 py-0.5 rounded-full">
              Required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cid && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-white/70">Free</span>
            <button
              type="button"
              onClick={() => onFreeToggle(!isFree)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                isFree ? "bg-anime-pink" : "bg-white/25"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  isFree ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>
      </div>
      <div className="bg-black/55 px-4 py-4">
        <label
          className={`flex items-center gap-3 cursor-pointer group ${
            isUploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              cid ? "bg-emerald-500/25" : "bg-white/20 group-hover:bg-white/30"
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-anime-pink animate-spin" />
            ) : cid ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Upload className="w-4 h-4 text-white/70" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {cid ? (
              <>
                <p className="text-xs font-medium text-emerald-400">Uploaded ✓</p>
                <p
                  className="text-[10px] text-white/50 font-mono truncate mt-0.5"
                  title={cid}
                >
                  {cid}
                </p>
                <div className="mt-3">
                  {accept.includes("video") ? (
                    <video
                      src={ipfsUrl(cid)}
                      className="w-20 h-20 rounded-lg object-cover border border-white/20"
                      muted
                      playsInline
                      loop
                    />
                  ) : (
                    <img
                      src={ipfsUrl(cid)}
                      alt={`${label} preview`}
                      className="w-20 h-20 rounded-lg object-cover border border-white/20"
                    />
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-white/85 group-hover:text-white">
                {isUploading ? "Uploading…" : "Choose file"}
              </p>
            )}
          </div>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function StoryUploadRow({
  label,
  cid,
  isUploading,
  onFile,
  onRemove,
  accept = "image/*",
}: {
  label: string;
  cid: string;
  isUploading: boolean;
  onFile: (f: File) => void;
  onRemove?: () => void;
  /** File input accept attribute, e.g. "image/*" or "image/*,video/*" */
  accept?: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/25 shadow-lg shadow-black/20">
      <div className="bg-black/70 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">{label}</span>
        {cid && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        )}
      </div>
      <div className="bg-black/55 px-4 py-4">
        <label
          className={`flex items-center gap-3 cursor-pointer group ${
            isUploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              cid ? "bg-emerald-500/25" : "bg-white/20 group-hover:bg-white/30"
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-anime-pink animate-spin" />
            ) : cid ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Upload className="w-4 h-4 text-white/70" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {cid ? (
              <>
                <p className="text-xs font-medium text-emerald-400">Uploaded ✓</p>
                <p
                  className="text-[10px] text-white/50 font-mono truncate mt-0.5"
                  title={cid}
                >
                  {cid}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/85 group-hover:text-white">
                {isUploading ? "Uploading…" : "Choose file"}
              </p>
            )}
          </div>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("publish");

  // Publish form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsdc, setPriceUsdc] = useState("");
  const [priceAnimatedUsdc, setPriceAnimatedUsdc] = useState("");
  const [sfwCid, setSfwCid] = useState("");
  const [nsfwCid, setNsfwCid] = useState("");
  const [animatedCid, setAnimatedCid] = useState("");
  const [uploading, setUploading] = useState<"" | "sfw" | "nsfw" | "animated">("");
  const [freeFlags, setFreeFlags] = useState<FreeFlags>({
    sfw: true,
    nsfw: false,
    animated: false,
  });
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastPublishedSummary, setLastPublishedSummary] = useState<{
    title: string;
    hasSfw: boolean;
    hasNsfw: boolean;
    hasAnimated: boolean;
    priceUsdc: number;
    priceAnimatedUsdc: number;
  } | null>(null);

  // My content list + edit
  const [contentList, setContentList] = useState<ContentRow[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriceUsdc, setEditPriceUsdc] = useState("");
  const [editPriceAnimatedUsdc, setEditPriceAnimatedUsdc] = useState("");
  const [editSfwCid, setEditSfwCid] = useState("");
  const [editNsfwCid, setEditNsfwCid] = useState("");
  const [editAnimatedCid, setEditAnimatedCid] = useState("");
  const [editFreeFlags, setEditFreeFlags] = useState<FreeFlags>({
    sfw: true,
    nsfw: false,
    animated: false,
  });
  const [editUploading, setEditUploading] = useState<"" | "sfw" | "nsfw" | "animated">("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stories
  const [storyImageCid, setStoryImageCid] = useState("");
  const [storyNsfwCid, setStoryNsfwCid] = useState("");
  const [storyAnimatedCid, setStoryAnimatedCid] = useState("");
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyUploading, setStoryUploading] = useState<"" | "image" | "nsfw" | "animated">("");
  const [storyPaid, setStoryPaid] = useState(false);
  const [storyPriceUsdc, setStoryPriceUsdc] = useState("");
  const [storyDurationHours, setStoryDurationHours] = useState(24);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [storiesList, setStoriesList] = useState<StoryRow[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  const isFree = freeFlags.sfw && freeFlags.nsfw && freeFlags.animated;

  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      const data = await res.json();
      if (res.ok) setContentList(data.content ?? []);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const res = await fetch("/api/admin/stories");
      const data = await res.json();
      if (res.ok) setStoriesList(data.stories ?? []);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "content") fetchContent();
  }, [tab, fetchContent]);

  useEffect(() => {
    if (tab === "stories") fetchStories();
  }, [tab, fetchStories]);

  const uploadFile = async (
    type: "sfw" | "nsfw" | "animated",
    file: File,
    setCid: (c: string) => void,
    setUploadingState: (s: "" | "sfw" | "nsfw" | "animated") => void
  ) => {
    setUploadingState(type);
    setError("");
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCid(data.cid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingState("");
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!sfwCid.trim() && !nsfwCid.trim() && !animatedCid.trim()) {
      setError("At least one required: SFW, NSFW, or Animated");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          sfw_cid: sfwCid.trim() || null,
          nsfw_cid: nsfwCid.trim() || null,
          animated_cid: animatedCid.trim() || null,
          price_usdc: freeFlags.nsfw ? 0 : parseFloat(priceUsdc) || 0,
          price_animated_usdc: freeFlags.animated ? 0 : parseFloat(priceAnimatedUsdc) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      // Capture a lightweight summary so the admin clearly sees what was just published.
      const trimmedTitle = title.trim();
      const hasSfw = !!sfwCid.trim();
      const hasNsfw = !!nsfwCid.trim();
      const hasAnimated = !!animatedCid.trim();
      setLastPublishedSummary({
        title: trimmedTitle || "(Untitled artwork)",
        hasSfw,
        hasNsfw,
        hasAnimated,
        priceUsdc: freeFlags.nsfw ? 0 : parseFloat(priceUsdc) || 0,
        priceAnimatedUsdc: freeFlags.animated ? 0 : parseFloat(priceAnimatedUsdc) || 0,
      });
      setTitle("");
      setDescription("");
      setPriceUsdc("");
      setPriceAnimatedUsdc("");
      setSfwCid("");
      setNsfwCid("");
      setAnimatedCid("");
      setFreeFlags({ sfw: true, nsfw: false, animated: false });
      setSuccess("Content published successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const openEdit = (row: ContentRow) => {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
    setEditPriceUsdc(String(row.price_usdc));
    setEditPriceAnimatedUsdc(String(row.price_animated_usdc ?? 0));
    setEditSfwCid(row.sfw_cid ?? "");
    setEditNsfwCid(row.nsfw_cid ?? "");
    setEditAnimatedCid(row.animated_cid ?? "");
    setEditFreeFlags({
      sfw: row.price_usdc === 0,
      nsfw: row.price_usdc === 0,
      animated: (row.price_animated_usdc ?? 0) === 0,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setError("");
  };

  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    if (!editSfwCid.trim() && !editNsfwCid.trim() && !editAnimatedCid.trim()) {
      setError("At least one required: SFW, NSFW, or Animated");
      return;
    }
    setSaving(true);
    try {
      const patchBody: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        price_usdc: editFreeFlags.nsfw ? 0 : parseFloat(editPriceUsdc) || 0,
        price_animated_usdc: editFreeFlags.animated ? 0 : parseFloat(editPriceAnimatedUsdc) || 0,
      };
      const sfw = editSfwCid.trim();
      const nsfw = editNsfwCid.trim();
      const animated = editAnimatedCid.trim();
      if (sfw) patchBody.sfw_cid = sfw;
      if (nsfw) patchBody.nsfw_cid = nsfw;
      if (animated) patchBody.animated_cid = animated;
      const res = await fetch(`/api/content/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setSuccess("Content updated!");
      setTimeout(() => setSuccess(""), 3000);
      closeEdit();
      fetchContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm("Delete this content? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setContentList((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const uploadStoryFile = async (
    type: "image" | "nsfw" | "animated",
    file: File
  ) => {
    setStoryUploading(type);
    setError("");
    try {
      const formData = new FormData();
      formData.set("type", type === "image" ? "sfw" : type);
      formData.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (type === "image") setStoryImageCid(data.cid);
      else if (type === "nsfw") setStoryNsfwCid(data.cid);
      else setStoryAnimatedCid(data.cid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setStoryUploading("");
    }
  };

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStorySubmitting(true);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_cid: storyImageCid || storyNsfwCid || storyAnimatedCid,
          nsfw_cid: storyNsfwCid || null,
          animated_cid: storyAnimatedCid || null,
          is_paid: storyPaid,
          price_usdc: storyPaid ? parseFloat(storyPriceUsdc) || 0 : 0,
          duration_hours: storyDurationHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add story");
      setSuccess("Story added!");
      setTimeout(() => setSuccess(""), 3000);
      setStoryImageCid("");
      setStoryNsfwCid("");
      setStoryAnimatedCid("");
      setStoryPriceUsdc("");
      setStoryPaid(false);
      setStoryDurationHours(24);
      fetchStories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add story");
    } finally {
      setStorySubmitting(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    setDeletingStoryId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setStoriesList((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingStoryId(null);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "publish", label: "Publish", icon: <Upload className="w-4 h-4" /> },
    { id: "content", label: "My content", icon: <FileText className="w-4 h-4" /> },
    { id: "stories", label: "Stories", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-anime-night p-4 sm:p-6 text-white">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Nixie Admin</h1>
            <p className="text-xs text-white/50 mt-0.5">
              {tab === "publish"
                ? "Publish new content"
                : tab === "content"
                  ? "Manage content"
                  : "Stories"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-black/50 rounded-xl border border-white/25 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/40 text-sm text-red-200 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="space-y-3 mb-4">
            <div className="rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-400/40 text-sm text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4" /> {success}
            </div>
            {tab === "publish" && lastPublishedSummary && (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-100 flex flex-col gap-1">
                <div className="font-semibold text-sm text-emerald-200">
                  Last published content
                </div>
                <div className="text-emerald-50 truncate">
                  Title: <span className="font-medium">{lastPublishedSummary.title}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {lastPublishedSummary.hasSfw && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40">
                      SFW
                    </span>
                  )}
                  {lastPublishedSummary.hasNsfw && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40">
                      NSFW {lastPublishedSummary.priceUsdc > 0 && `(USD ${lastPublishedSummary.priceUsdc.toFixed(2)})`}
                    </span>
                  )}
                  {lastPublishedSummary.hasAnimated && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40">
                      Animated{" "}
                      {lastPublishedSummary.priceAnimatedUsdc > 0 &&
                        `(USD ${lastPublishedSummary.priceAnimatedUsdc.toFixed(2)})`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Publish tab */}
        {tab === "publish" && (
          <form onSubmit={handlePublish} className="space-y-4">
            <div className="bg-black/70 rounded-2xl p-4 border border-white/25 shadow-lg shadow-black/20 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                  placeholder="Artwork title"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-white/90">
                    Description
                  </label>
                  <span className="text-xs text-white/55">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  rows={4}
                  className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm resize-none border border-white/25"
                  placeholder="Tell the story behind this piece..."
                />
              </div>
            </div>
            <UploadZone
              label="SFW image"
              accept="image/*"
              cid={sfwCid}
              isUploading={uploading === "sfw"}
              isFree={freeFlags.sfw}
              onFile={(f) =>
                uploadFile("sfw", f, setSfwCid, setUploading)
              }
              onFreeToggle={(v) =>
                setFreeFlags((p) => ({ ...p, sfw: v }))
              }
            />
            <UploadZone
              label="NSFW image"
              accept="image/*"
              cid={nsfwCid}
              isUploading={uploading === "nsfw"}
              isFree={freeFlags.nsfw}
              onFile={(f) =>
                uploadFile("nsfw", f, setNsfwCid, setUploading)
              }
              onFreeToggle={(v) =>
                setFreeFlags((p) => ({ ...p, nsfw: v }))
              }
            />
            <UploadZone
              label="Animated"
              accept="image/*,video/*"
              cid={animatedCid}
              isUploading={uploading === "animated"}
              isFree={freeFlags.animated}
              onFile={(f) =>
                uploadFile("animated", f, setAnimatedCid, setUploading)
              }
              onFreeToggle={(v) =>
                setFreeFlags((p) => ({ ...p, animated: v }))
              }
            />
            {!!nsfwCid.trim() && !freeFlags.nsfw && (
              <div className="bg-black/70 rounded-2xl p-4 border border-white/25 shadow-lg shadow-black/20">
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  NSFW unlock price (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={priceUsdc}
                  onChange={(e) => setPriceUsdc(e.target.value)}
                  className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                  placeholder="2.50"
                />
              </div>
            )}
            {!!animatedCid.trim() && !freeFlags.animated && (
              <div className="bg-black/70 rounded-2xl p-4 border border-white/25 shadow-lg shadow-black/20">
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Animated unlock price (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={priceAnimatedUsdc}
                  onChange={(e) => setPriceAnimatedUsdc(e.target.value)}
                  className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                  placeholder="1.00"
                />
              </div>
            )}
            <NixieButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={
                publishing ||
                // Require at least one media type
                (!sfwCid.trim() && !nsfwCid.trim() && !animatedCid.trim()) ||
                // Only require NSFW price if there *is* an NSFW image and it's not free
                (!!nsfwCid.trim() && !freeFlags.nsfw && !priceUsdc) ||
                // Only require Animated price if there *is* an animated asset and it's not free
                (!!animatedCid.trim() && !freeFlags.animated && !priceAnimatedUsdc)
              }
            >
              {publishing ? "Publishing…" : "Publish to feed"}
            </NixieButton>
          </form>
        )}

        {/* My content tab */}
        {tab === "content" && (
          <div className="space-y-4">
            {contentLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#D27A92] animate-spin" />
              </div>
            ) : contentList.length === 0 ? (
              <div className="bg-black/70 rounded-2xl p-8 border border-white/25 shadow-lg shadow-black/20 text-center text-white/70">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No content yet. Publish from the Publish tab.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {contentList.map((row) => (
                  <li
                    key={row.id}
                    className="bg-black/70 rounded-2xl border border-white/25 shadow-lg shadow-black/20 overflow-hidden flex items-stretch"
                  >
                    <div className="w-20 h-20 flex-shrink-0 bg-white/5 flex items-center justify-center overflow-hidden">
                      {row.sfw_cid ? (
                        <img
                          src={ipfsUrl(row.sfw_cid)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-[#D27A92] opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                      <p className="font-semibold text-white/90 truncate">
                        {row.title}
                      </p>
                      <p className="text-xs text-white/50">
                        ${row.price_usdc} USDC ·{" "}
                        {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-anime-pink transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContent(row.id)}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === row.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Edit modal */}
            {editingId && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={(e) => e.target === e.currentTarget && closeEdit()}
              >
                <div
                  className="bg-[#16131f] rounded-2xl border border-white/25 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl shadow-black/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/25 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white/90">
                      Edit content
                    </h2>
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="text-white/60 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <form
                    onSubmit={handleUpdateContent}
                    className="p-4 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) =>
                          setEditDescription(e.target.value.slice(0, 500))
                        }
                        rows={3}
                        className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm resize-none border border-white/25"
                      />
                    </div>
                    <UploadZone
                      label="SFW image"
                      accept="image/*"
                      cid={editSfwCid}
                      isUploading={editUploading === "sfw"}
                      isFree={editFreeFlags.sfw}
                      required
                      onFile={(f) =>
                        uploadFile(
                          "sfw",
                          f,
                          setEditSfwCid,
                          setEditUploading
                        )
                      }
                      onFreeToggle={(v) =>
                        setEditFreeFlags((p) => ({ ...p, sfw: v }))
                      }
                      onRemove={() => setEditSfwCid("")}
                    />
                    <UploadZone
                      label="NSFW image"
                      accept="image/*"
                      cid={editNsfwCid}
                      isUploading={editUploading === "nsfw"}
                      isFree={editFreeFlags.nsfw}
                      required
                      onFile={(f) =>
                        uploadFile(
                          "nsfw",
                          f,
                          setEditNsfwCid,
                          setEditUploading
                        )
                      }
                      onFreeToggle={(v) =>
                        setEditFreeFlags((p) => ({ ...p, nsfw: v }))
                      }
                      onRemove={() => setEditNsfwCid("")}
                    />
                    <UploadZone
                      label="Animated (optional)"
                      accept="image/*,video/*"
                      cid={editAnimatedCid}
                      isUploading={editUploading === "animated"}
                      isFree={editFreeFlags.animated}
                      onFile={(f) =>
                        uploadFile(
                          "animated",
                          f,
                          setEditAnimatedCid,
                          setEditUploading
                        )
                      }
                      onFreeToggle={(v) =>
                        setEditFreeFlags((p) => ({ ...p, animated: v }))
                      }
                      onRemove={() => setEditAnimatedCid("")}
                    />
                    {!editFreeFlags.nsfw && (
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          NSFW unlock price (USDC)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPriceUsdc}
                          onChange={(e) => setEditPriceUsdc(e.target.value)}
                          className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                        />
                      </div>
                    )}
                    {!editFreeFlags.animated && (
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          Animated unlock price (USDC)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPriceAnimatedUsdc}
                          onChange={(e) => setEditPriceAnimatedUsdc(e.target.value)}
                          className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <NixieButton
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={closeEdit}
                      >
                        Cancel
                      </NixieButton>
                      <NixieButton
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={
                          saving ||
                          (!editSfwCid.trim() && !editNsfwCid.trim() && !editAnimatedCid.trim())
                        }
                      >
                        {saving ? "Saving…" : "Save"}
                      </NixieButton>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stories tab */}
        {tab === "stories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white/80">Stories</h3>
              <button
                type="button"
                onClick={() => setShowStoryForm((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white/80"
              >
                {showStoryForm ? "Hide form" : "Add new story"}
              </button>
            </div>
            {showStoryForm && (
            <form
              onSubmit={handleAddStory}
              className="bg-black/70 rounded-2xl p-4 border border-white/25 shadow-lg shadow-black/20 space-y-4"
            >
              <h3 className="text-sm font-bold text-white/80">
                Add new story
              </h3>
              <p className="text-xs text-white/60">
                At least one required: SFW image, NSFW image, or Animated (gif/video).
              </p>
              <StoryUploadRow
                label="Story image (SFW)"
                cid={storyImageCid}
                isUploading={storyUploading === "image"}
                onFile={(f) => uploadStoryFile("image", f)}
                onRemove={storyImageCid ? () => setStoryImageCid("") : undefined}
              />
              <StoryUploadRow
                label="NSFW image"
                cid={storyNsfwCid}
                isUploading={storyUploading === "nsfw"}
                onFile={(f) => uploadStoryFile("nsfw", f)}
                onRemove={
                  storyNsfwCid ? () => setStoryNsfwCid("") : undefined
                }
              />
              <StoryUploadRow
                label="Animated (gif/video)"
                accept="image/*,video/*"
                cid={storyAnimatedCid}
                isUploading={storyUploading === "animated"}
                onFile={(f) => uploadStoryFile("animated", f)}
                onRemove={storyAnimatedCid ? () => setStoryAnimatedCid("") : undefined}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storyPaid}
                    onChange={(e) => setStoryPaid(e.target.checked)}
                    className="rounded border-white/30 text-anime-pink focus:ring-anime-pink"
                  />
                  <span className="text-sm text-white/90">Paid story</span>
                </label>
              </div>
              {storyPaid && (
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Price (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={storyPriceUsdc}
                    onChange={(e) => setStoryPriceUsdc(e.target.value)}
                    className="w-full bg-black/65 rounded-xl px-4 py-3 text-white placeholder:text-white/55 outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                    placeholder="0.50"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Visible for (hours)
                </label>
                <select
                  value={storyDurationHours}
                  onChange={(e) =>
                    setStoryDurationHours(Number(e.target.value))
                  }
                  className="w-full bg-black/65 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-anime-pink text-sm border border-white/25"
                >
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours (1 day)</option>
                  <option value={48}>48 hours (2 days)</option>
                  <option value={72}>72 hours (3 days)</option>
                </select>
              </div>
              <NixieButton
                type="submit"
                variant="primary"
                className="w-full"
                disabled={storySubmitting || (!storyImageCid && !storyNsfwCid && !storyAnimatedCid)}
              >
                {storySubmitting ? "Adding…" : "Add story"}
              </NixieButton>
            </form>
            )}

            <div>
              <h3 className="text-sm font-bold text-white/80 mb-3">
                All stories
              </h3>
              {storiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#D27A92] animate-spin" />
                </div>
              ) : storiesList.length === 0 ? (
                <div className="bg-black/70 rounded-2xl p-6 border border-white/25 shadow-lg shadow-black/20 text-center text-white/70 text-sm">
                  No stories. Add one above.
                </div>
              ) : (
                <ul className="space-y-3">
                  {storiesList.map((s) => {
                    const isExpired =
                      new Date(s.expires_at).getTime() < Date.now();
                    return (
                      <li
                        key={s.id}
                        className="bg-black/70 rounded-2xl border border-white/25 shadow-lg shadow-black/20 overflow-hidden flex items-center gap-3 p-3"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                          {s.animated_cid && s.image_cid === s.animated_cid ? (
                            <video
                              src={ipfsUrl(s.image_cid)}
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={ipfsUrl(s.image_cid)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/50">
                            {s.is_paid
                              ? `$${s.price_usdc} USDC`
                              : "Free"}{" "}
                            · {s.duration_hours}h
                          </p>
                          <p
                            className={`text-xs ${
                              isExpired ? "text-red-400" : "text-emerald-300"
                            }`}
                          >
                            {isExpired
                              ? "Expired"
                              : `Expires ${new Date(
                                  s.expires_at
                                ).toLocaleString()}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStory(s.id)}
                          disabled={deletingStoryId === s.id}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingStoryId === s.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
