"use client";

import { useState, useRef, useEffect } from "react";
import { ListPlus, Plus, Loader2 } from "lucide-react";

type ListRow = { id: string; name: string };

interface AddToListPopoverProps {
  contentId: string;
  lists: ListRow[];
  wallet: string | null;
  onAdded?: (listId: string) => void;
  onListCreated?: (list: ListRow) => void;
  className?: string;
  /** Compact style (icon only). */
  compact?: boolean;
}

export function AddToListPopover({
  contentId,
  lists,
  wallet,
  onAdded,
  onListCreated,
  className = "",
  compact = false,
}: AddToListPopoverProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const addToList = async (listId: string) => {
    if (!wallet) return;
    setAddingId(listId);
    try {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, contentId }),
      });
      if (res.ok) {
        onAdded?.(listId);
        setOpen(false);
      }
    } finally {
      setAddingId(null);
    }
  };

  const createListAndAdd = async () => {
    if (!wallet) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, name: newListName || "New list" }),
      });
      const d = await res.json();
      if (d.list) {
        onListCreated?.(d.list);
        await addToList(d.list.id);
        setNewListName("");
        setShowNewForm(false);
      }
    } finally {
      setCreating(false);
    }
  };

  if (!wallet) return null;

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-colors"
        title="Add to list"
      >
        <ListPlus className="w-3.5 h-3.5" />
        {!compact && <span>Add to list</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] py-1 rounded-xl bg-[#1a1625] border border-white/10 shadow-xl">
          {showNewForm ? (
            <div className="px-3 py-2 space-y-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                className="w-full px-2.5 py-1.5 rounded-lg text-sm bg-white/[0.06] border border-white/10 text-white placeholder-white/40"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createListAndAdd}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-anime-pink/80 text-white disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); setNewListName(""); }}
                  className="px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => addToList(list.id)}
                  disabled={addingId === list.id}
                  className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06] hover:text-white flex items-center justify-between gap-2 disabled:opacity-50"
                >
                  <span className="truncate">{list.name}</span>
                  {addingId === list.id && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="w-full px-3 py-2 text-left text-sm text-anime-pink/90 hover:bg-white/[0.06] flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New list
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
