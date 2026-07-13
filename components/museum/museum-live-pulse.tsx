"use client";
import { useCallback, useEffect, useState } from "react";
import { Radio, Sparkles } from "lucide-react";
type Visitor = { wallet: string; display_name: string; avatar: "female" | "male"; access_source: "token" | "nft" | "preview" };
export function MuseumLivePulse() {
  const [visitors, setVisitors] = useState<Visitor[]>([]); const [notice, setNotice] = useState<{ body: string; expires_at: string } | null>(null);
  const load = useCallback(async () => { const [presence, notes] = await Promise.all([fetch("/api/museum/presence", { credentials: "include" }).then((r) => r.json()), fetch("/api/museum/notices", { credentials: "include" }).then((r) => r.json())]); setVisitors(Array.isArray(presence.visitors) ? presence.visitors : []); setNotice(notes.notice ?? null); }, []);
  useEffect(() => { void load(); void fetch("/api/museum/presence", { method: "POST", credentials: "include" }); const timer = window.setInterval(() => { void load(); void fetch("/api/museum/presence", { method: "POST", credentials: "include" }); }, 30_000); return () => window.clearInterval(timer); }, [load]);
  return <div className="fixed left-1/2 top-20 z-40 w-[min(520px,calc(100vw-48px))] -translate-x-1/2 space-y-2 pointer-events-none">{notice && <div className="rounded-xl border border-[#D7FF00]/30 bg-[#10100d]/90 px-4 py-3 text-center text-sm text-[#eaf9b3] shadow-xl backdrop-blur-md"><Sparkles className="mr-2 inline h-4 w-4 text-[#D7FF00]" />Nixie&apos;s note: {notice.body}</div>}<div className="mx-auto w-max rounded-full border border-white/10 bg-[#0f0d14]/85 px-3 py-1.5 text-xs text-white/60 shadow-lg backdrop-blur-md"><Radio className="mr-1.5 inline h-3 w-3 text-[#D7FF00]" />{visitors.length ? `${visitors.length} holder${visitors.length === 1 ? " is" : "s are"} lingering tonight` : "The museum is quiet tonight"}{visitors.some((visitor) => visitor.access_source === "nft") && <span className="ml-2 text-[#D7FF00]">· Collector in residence</span>}</div></div>;
}
