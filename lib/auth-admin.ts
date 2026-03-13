import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function getAdminUser(): Promise<{ user: User } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || (ADMIN_EMAIL && user.email !== ADMIN_EMAIL)) {
    return { error: "Unauthorized" };
  }
  return { user };
}
