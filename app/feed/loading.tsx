export default function FeedLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-anime-pink border-t-transparent animate-spin" />
      <p className="text-white/50 text-sm">Loading feed…</p>
    </div>
  );
}
