import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { generateAI, parseAIJson } from '@/services/ai-service';
import { SALON_COACH_SYSTEM, buildCoachPrompt, CAMPAIGN_GENERATOR_SYSTEM, buildCampaignPrompt, CONTENT_GENERATOR_SYSTEM, CUSTOMER_MESSAGE_SYSTEM } from '@/services/ai-prompts';
import { sql, sqlOne } from '@/lib/db/neon';

// POST /api/ai/coach — Chat with AI salon coach
export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { question, type } = body; // type: 'coach' | 'campaign' | 'message' | 'content'

    const salonId = auth.salonId;

    // Gather salon data for context
    const [stats, topServices, activeCampaigns] = await Promise.all([
      sqlOne(
        `SELECT
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE status = 'vip') as vip_customers,
          COUNT(*) FILTER (WHERE status IN ('inactive', 'lost')) as inactive_customers,
          COUNT(*) FILTER (WHERE status = 'new') as new_customers,
          COUNT(*) FILTER (WHERE status = 'hot') as hot_customers,
          ROUND(AVG(average_ticket) FILTER (WHERE average_ticket > 0), 2) as avg_ticket,
          SUM(total_spent) FILTER (WHERE created_at >= date_trunc('month', NOW())) as revenue_this_month
         FROM customers WHERE salon_id = $1`,
        [salonId]
      ),
      sql(
        `SELECT name FROM services WHERE salon_id = $1 AND active = TRUE ORDER BY price DESC LIMIT 5`,
        [salonId]
      ),
      sqlOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM campaigns WHERE salon_id = $1 AND status = 'active'`,
        [salonId]
      ),
    ]);

    const todayAppointments = await sqlOne<{ count: string; free_slots: string }>(
      `SELECT 
        COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed','attended')) as count,
        GREATEST(0, 8 - COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed','attended'))) as free_slots
       FROM appointments WHERE salon_id = $1 AND DATE(start_time) = CURRENT_DATE`,
      [salonId]
    );

    const salon = await sqlOne<{ name: string }>(
      `SELECT name FROM salons WHERE id = $1`,
      [salonId]
    );

    const coachData = {
      salonName: salon?.name || 'Seu Salão',
      totalCustomers: parseInt((stats as any)?.total_customers || '0'),
      newCustomers: parseInt((stats as any)?.new_customers || '0'),
      inactiveCustomers: parseInt((stats as any)?.inactive_customers || '0'),
      vipCustomers: parseInt((stats as any)?.vip_customers || '0'),
      hotCustomers: parseInt((stats as any)?.hot_customers || '0'),
      averageTicket: parseFloat((stats as any)?.avg_ticket || '0'),
      revenueThisMonth: parseFloat((stats as any)?.revenue_this_month || '0'),
      appointmentsToday: parseInt(todayAppointments?.count || '0'),
      freeSlotsTodayCount: parseInt(todayAppointments?.free_slots || '0'),
      topServices: (topServices as Array<{ name: string }>).map(s => s.name),
      activeCampaigns: parseInt(activeCampaigns?.count || '0'),
      question,
    };

    const response = await generateAI({
      systemPrompt: SALON_COACH_SYSTEM,
      userPrompt: buildCoachPrompt(coachData),
      temperature: 0.7,
      maxTokens: 1200,
      jsonSchema: { type: 'object' }, // forces Gemini to respond in JSON mode
    });

    let parsed;
    try {
      parsed = parseAIJson(response);
    } catch {
      parsed = {
        diagnosis: response.content,
        reason: '',
        action: '',
        message: null,
        metric: ''
      };
    }

    return NextResponse.json({
      response: parsed,
      provider: response.provider,
      model: response.model,
    });
  } catch (err) {
    console.error('[API /ai/coach]', err);
    return NextResponse.json({ error: 'Erro ao processar com IA.' }, { status: 500 });
  }
}
