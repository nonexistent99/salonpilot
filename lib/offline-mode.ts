type SupabaseClient = any;

export async function checkDatabaseHealth(
  supabase: SupabaseClient
): Promise<{ healthy: boolean; message: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1)
      .single();

    if (error) {
      if (error.message.includes("not found")) {
        return {
          healthy: false,
          message: "Database tables not initialized. Please run migrations.",
        };
      }
      return {
        healthy: false,
        message: `Database error: ${error.message}`,
      };
    }

    return { healthy: true, message: "Database connection OK" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("fetch failed") || errorMsg.includes("ECONNREFUSED")) {
      return {
        healthy: false,
        message: "Database instance is paused or unreachable. Please resume it in Supabase dashboard.",
      };
    }
    return {
      healthy: false,
      message: `Connection error: ${errorMsg}`,
    };
  }
}

export const MOCK_DATA = {
  profile: {
    id: "mock-user-1",
    full_name: "Demo User",
    agency_id: "mock-agency-1",
    role: "user",
    onboarding_completed: true,
  },
  agency: {
    id: "mock-agency-1",
    name: "Demo Agency",
    plan: "pro",
  },
  subscription: {
    agency_id: "mock-agency-1",
    plan: "pro",
    status: "active",
    searches_limit: 100,
    searches_used: 45,
    ai_credits_limit: 50,
    ai_credits_used: 12,
    music_limit: 10,
    music_used: 2,
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  leads: [
    {
      id: "lead-1",
      name: "Tech Startup XYZ",
      email: "contact@techxyz.com",
      phone: "+55 11 99999-0001",
      niche: "tecnologia",
      city: "São Paulo",
      score_ia: 85,
      opportunity_score: 85,
      status: "new",
      opening_hours: "09:00-18:00",
      rating: 4.5,
      created_at: new Date().toISOString(),
    },
    {
      id: "lead-2",
      name: "E-commerce Store ABC",
      email: "info@abcecom.com",
      phone: "+55 11 99999-0002",
      niche: "ecommerce",
      city: "Rio de Janeiro",
      score_ia: 72,
      opportunity_score: 72,
      status: "contacted",
      opening_hours: "10:00-19:00",
      rating: 4.2,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  credits: {
    balance: 150,
    total_purchased: 300,
    total_used: 150,
  },
};
