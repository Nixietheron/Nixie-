"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NixieButton } from "@/components/nixie";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7E8EB] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#D27A92]/10 p-8">
        <h1 className="text-2xl text-[#5A3D45] mb-2">Nixie Admin</h1>
        <p className="text-sm text-[#8B6B73] mb-6">Sign in to publish content</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5A3D45] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#F7E8EB] rounded-xl px-4 py-3 text-[#5A3D45] outline-none focus:ring-2 focus:ring-[#D27A92]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5A3D45] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#F7E8EB] rounded-xl px-4 py-3 text-[#5A3D45] outline-none focus:ring-2 focus:ring-[#D27A92]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <NixieButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </NixieButton>
        </form>
      </div>
    </div>
  );
}
