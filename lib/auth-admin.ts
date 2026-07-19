import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getAdminUser(): Promise<{ user: User } | { error: string }> {
  // Admin access must fail closed when production configuration is incomplete.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return { error: "Unauthorized" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || user.email.trim().toLowerCase() !== adminEmail) {
    return { error: "Unauthorized" };
  }
  return { user };
}
