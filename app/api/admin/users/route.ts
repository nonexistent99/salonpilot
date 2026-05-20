import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, agency_id, onboarding_completed, created_at")
    .order("created_at", { ascending: false });

  if (!profiles) return NextResponse.json({ users: [] });

  // Get subscription + credit info for each user's agency
  const agencyIds = [...new Set(profiles.map((p) => p.agency_id).filter(Boolean))];

  const [{ data: subs }, { data: credits }] = await Promise.all([
    supabase.from("subscriptions").select("agency_id, plan, status, searches_used, ai_credits_used, music_used").in("agency_id", agencyIds),
    supabase.from("credits").select("agency_id, balance").in("agency_id", agencyIds),
  ]);

  const subMap = new Map((subs || []).map((s) => [s.agency_id, s]));
  const creditMap = new Map((credits || []).map((c) => [c.agency_id, c]));

  const users = profiles.map((p) => ({
    ...p,
    subscription: subMap.get(p.agency_id) || null,
    credits: creditMap.get(p.agency_id)?.balance ?? 0,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const body = await request.json();
  const { userId, action, value } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  // Get user's agency
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", userId)
    .single();

  if (!profile?.agency_id) {
    return NextResponse.json({ error: "User has no agency" }, { status: 400 });
  }

  switch (action) {
    case "add_credits": {
      const amount = parseInt(value, 10);
      if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

      await supabase.rpc("increment_credits", { p_agency_id: profile.agency_id, p_amount: amount });

      // Fallback if RPC doesn't exist: direct update
      await supabase
        .from("credits")
        .update({ balance: amount })
        .eq("agency_id", profile.agency_id);

      await supabase.from("credit_transactions").insert({
        agency_id: profile.agency_id,
        amount,
        type: "admin_grant",
        description: `Admin adicionou ${amount} creditos`,
      });

      return NextResponse.json({ success: true });
    }

    case "change_plan": {
      const planLimits: Record<string, { searches: number; aiCredits: number; music: number }> = {
        free: { searches: 10, aiCredits: 20, music: 3 },
        starter: { searches: 50, aiCredits: 50, music: 10 },
        pro: { searches: 200, aiCredits: 200, music: 50 },
      };
      const limits = planLimits[value] || planLimits.free;

      await supabase
        .from("subscriptions")
        .update({
          plan: value,
          status: "active",
          searches_limit: limits.searches,
          ai_credits_limit: limits.aiCredits,
          music_limit: limits.music,
        })
        .eq("agency_id", profile.agency_id);

      return NextResponse.json({ success: true });
    }

    case "deactivate": {
      await supabase
        .from("subscriptions")
        .update({ status: "inactive" })
        .eq("agency_id", profile.agency_id);
      return NextResponse.json({ success: true });
    }

    case "activate": {
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("agency_id", profile.agency_id);
      return NextResponse.json({ success: true });
    }

    case "change_role": {
      await supabase.from("profiles").update({ role: value }).eq("id", userId);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
