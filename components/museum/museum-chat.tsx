"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

const ROOMS = [
  { id: "lounge", label: "Lounge" },
  { id: "gallery", label: "Gallery" },
  { id: "private-viewing", label: "Private view" },
] as const;
type Room = (typeof ROOMS)[number]["id"];
type ChatMessage = { id: string; room: Room; wallet: string; display_name: string; body: string; created_at: string; expires_at: string };

function fadeFor(expiresAt: string) {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 0;
  const full = 2 * 60 * 60 * 1000;
  return Math.max(0.25, Math.min(1, remaining / full + 0.2));
}

export function MuseumChat() {
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<Room>("lounge");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/museum/chat?room=${room}`, { credentials: "include", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [room]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(timer);
  }, [load, open]);

  const visibleMessages = useMemo(() => messages.filter((message) => new Date(message.expires_at).getTime() > Date.now()), [messages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch("/api/museum/chat", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, body }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send your note.");
      setDraft("");
      setMessages((current) => [...current, data.message].slice(-80));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send your note.");
    } finally { setSending(false); }
  };

  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl border border-[#D7FF00]/30 bg-[#0f0d14]/90 px-4 py-3 text-sm font-medium text-[#edfbb0] shadow-xl backdrop-blur-md hover:bg-[#1a1822]">
      <MessageCircle className="h-4 w-4 text-[#D7FF00]" /> After Hours Notes
    </button>
    {open && <section className="fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100vh-96px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0f0d14]/95 shadow-2xl backdrop-blur-xl">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-[#D7FF00]" /> After Hours Notes</p><p className="mt-1 text-[11px] text-white/45">Notes fade into the night after two hours.</p></div><button onClick={() => setOpen(false)} className="rounded-full p-1 text-white/55 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 flex gap-1 rounded-lg bg-white/5 p-1">{ROOMS.map((option) => <button key={option.id} onClick={() => setRoom(option.id)} className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${room === option.id ? "bg-[#D7FF00] text-[#12100c]" : "text-white/55 hover:text-white"}`}>{option.label}</button>)}</div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">{visibleMessages.length === 0 ? <p className="py-12 text-center text-sm text-white/35">The room is quiet. Leave the first note.</p> : visibleMessages.map((message) => <article key={message.id} style={{ opacity: fadeFor(message.expires_at) }} className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5"><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-[#D7FF00]">{message.display_name}</span><span className="shrink-0 text-[10px] text-white/35">fading later</span></div><p className="break-words text-sm leading-relaxed text-white/80">{message.body}</p></article>)}</div>
      <form onSubmit={send} className="border-t border-white/10 p-3"><div className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 280))} maxLength={280} placeholder="Leave a note for the room…" className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D7FF00]/70" /><button disabled={!draft.trim() || sending} className="rounded-xl bg-[#D7FF00] px-3 text-[#16140e] disabled:opacity-45" aria-label="Send note"><Send className="h-4 w-4" /></button></div>{error && <p className="mt-2 text-xs text-red-300">{error}</p>}</form>
    </section>}
  </>;
}
