"use server";

import { getUser } from "@/lib/auth-server";
import { sqlOne } from "@/lib/db/neon";
import { redirect } from "next/navigation";

export async function getSessionOrRedirect() {
  const user = await getUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function getAgencyId(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const profile = await sqlOne<{ agency_id: string }>(
    `SELECT agency_id FROM profiles WHERE id = $1`,
    [user.id]
  );
  return profile?.agency_id ?? null;
}
