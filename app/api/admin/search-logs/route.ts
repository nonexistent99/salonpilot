import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: logs } = await supabase
    .from("search_logs")
    .select("*")
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false });

  const allLogs = logs || [];

  // Total searches this month
  const totalSearches = allLogs.length;
  const totalResults = allLogs.reduce((s, l) => s + (l.results_count || 0), 0);

  // Top niches
  const nicheCount: Record<string, number> = {};
  for (const l of allLogs) {
    const n = l.query_niche || "N/A";
    nicheCount[n] = (nicheCount[n] || 0) + 1;
  }
  const topNiches = Object.entries(nicheCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([niche, count]) => ({ niche, count }));

  // Top cities
  const cityCount: Record<string, number> = {};
  for (const l of allLogs) {
    const c = l.query_city || "N/A";
    cityCount[c] = (cityCount[c] || 0) + 1;
  }
  const topCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  // Top users searching (by agency_id)
  const agencyCount: Record<string, number> = {};
  for (const l of allLogs) {
    if (!l.agency_id) continue;
    agencyCount[l.agency_id] = (agencyCount[l.agency_id] || 0) + 1;
  }

  const topAgencyIds = Object.entries(agencyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const ids = topAgencyIds.map(([id]) => id);
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name")
    .in("id", ids.length > 0 ? ids : ["__none__"]);

  const agencyMap = new Map((agencies || []).map((a) => [a.id, a.name]));

  const topSearchers = topAgencyIds.map(([id, count]) => ({
    agency_id: id,
    agency_name: agencyMap.get(id) || "N/A",
    searches: count,
  }));

  // Daily searches chart
  const dailySearches: { date: string; searches: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const count = allLogs.filter((l) => {
      const cd = new Date(l.created_at);
      return cd >= dayStart && cd < dayEnd;
    }).length;
    dailySearches.push({ date: label, searches: count });
  }

  return NextResponse.json({
    totalSearches,
    totalResults,
    topNiches,
    topCities,
    topSearchers,
    dailySearches,
    recent: allLogs.slice(0, 50),
  });
}
