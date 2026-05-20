type SupabaseClient = any;
import crypto from "crypto";

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  opening_hours?: { weekday_text?: string[] };
  photos?: { photo_reference: string }[];
  url?: string;
  types?: string[];
}

interface TextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  photos?: { photo_reference: string }[];
}

/**
 * Search leads using Google Places API with caching layer.
 */
export async function searchLeads(
  supabase: SupabaseClient,
  agencyId: string,
  city: string,
  niche: string
): Promise<{ leads: Record<string, unknown>[]; newCount: number; fromCache: boolean }> {
  const cacheKey = buildSearchHash(city, niche);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  // 1. Check search_cache (less than 24h old)
  const { data: cached } = await supabase
    .from("search_cache")
    .select("*")
    .eq("hash_key", cacheKey)
    .single();

  let baseResults: Record<string, unknown>[];
  let fromCache = false;

  if (cached && isWithin24Hours(cached.created_at)) {
    baseResults = cached.results as Record<string, unknown>[];
    fromCache = true;
  } else if (apiKey) {
    // 2. Query Google Places Text Search API
    baseResults = await fetchFromGooglePlaces(apiKey, city, niche);

    // 3. Update cache
    if (baseResults.length > 0) {
      await supabase.from("search_cache").upsert(
        { hash_key: cacheKey, results: baseResults, created_at: new Date().toISOString() },
        { onConflict: "hash_key" }
      );
    }
  } else {
    // Fallback to public_leads_base if no API key
    const { data: baseLeads, error } = await supabase
      .from("public_leads_base")
      .select("*")
      .ilike("city", `%${city}%`)
      .ilike("niche", `%${niche}%`)
      .limit(20);

    if (error) throw new Error("Erro ao buscar base interna: " + error.message);
    baseResults = (baseLeads || []) as Record<string, unknown>[];
  }

  if (baseResults.length === 0) {
    return { leads: [], newCount: 0, fromCache };
  }

  // 4. Deduplicate and insert leads
  const leadsToInsert = baseResults.map((bl) => ({
    agency_id: agencyId,
    name: bl.name as string,
    phone: (bl.phone as string) || "",
    city: bl.city as string || city,
    niche: bl.niche as string || niche,
    rating: bl.rating as number,
    reviews: bl.reviews_count as number,
    reviews_count: bl.reviews_count as number,
    has_website: !!(bl.website),
    website: bl.website as string,
    instagram_active: false,
    score_ia: calculateScore(bl),
    opportunity_score: calculateScore(bl),
    status: "new",
    place_id: bl.place_id as string,
    address: bl.address as string,
    opening_hours: bl.opening_hours,
    google_maps_url: bl.google_maps_url as string,
  }));

  let newCount = 0;
  for (const lead of leadsToInsert) {
    // Check duplicity by agency_id + place_id
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("place_id", lead.place_id)
      .is("deleted_at", null)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from("leads")
        .insert(lead);
      if (!error) newCount++;
    }
  }

  // 5. Return leads from agency's own DB
  const { data: dbLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .ilike("city", `%${city}%`)
    .ilike("niche", `%${niche}%`)
    .order("opportunity_score", { ascending: false });

  return { leads: (dbLeads || []) as Record<string, unknown>[], newCount, fromCache };
}

/**
 * Fetch businesses from Google Places Text Search API + Place Details
 */
async function fetchFromGooglePlaces(
  apiKey: string,
  city: string,
  niche: string
): Promise<Record<string, unknown>[]> {
  const query = encodeURIComponent(`${niche} em ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=pt-BR&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error("[v0] Google Places Text Search failed:", response.status);
    return [];
  }

  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[v0] Google Places API error:", data.status, data.error_message);
    return [];
  }

  const places: TextSearchResult[] = data.results?.slice(0, 15) || [];

  // Fetch details for each place (phone, website, hours)
  const detailedPlaces = await Promise.all(
    places.map(async (place) => {
      const details = await fetchPlaceDetails(apiKey, place.place_id);
      return {
        place_id: place.place_id,
        name: place.name,
        address: details?.formatted_address || place.formatted_address || "",
        phone: details?.formatted_phone_number || details?.international_phone_number || "",
        rating: place.rating || details?.rating || 0,
        reviews_count: place.user_ratings_total || details?.user_ratings_total || 0,
        website: details?.website || "",
        opening_hours: details?.opening_hours?.weekday_text || null,
        google_maps_url: details?.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        city,
        niche,
      };
    })
  );

  return detailedPlaces;
}

/**
 * Fetch place details (phone, website, hours)
 */
async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<GooglePlace | null> {
  const fields = "place_id,name,formatted_address,formatted_phone_number,international_phone_number,rating,user_ratings_total,website,opening_hours,url";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== "OK") return null;
    return data.result as GooglePlace;
  } catch {
    return null;
  }
}

function buildSearchHash(city: string, niche: string): string {
  const normalized = `${city.toLowerCase().trim()}:${niche.toLowerCase().trim()}`;
  return crypto.createHash("md5").update(normalized).digest("hex");
}

function isWithin24Hours(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function calculateScore(lead: Record<string, unknown>): number {
  let score = 60;
  const rating = Number(lead.rating ?? 0);
  const reviews = Number(lead.reviews_count ?? 0);
  const hasWebsite = !!lead.website;

  // Lower rating = higher opportunity (they need help)
  if (rating < 4) score += 15;
  if (rating < 3.5) score += 5;

  // Fewer reviews = less established = opportunity
  if (reviews < 50) score += 10;
  if (reviews < 20) score += 10;

  // No website = high opportunity
  if (!hasWebsite) score += 10;

  return Math.min(score, 100);
}
