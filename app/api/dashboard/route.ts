import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';

// GET /api/dashboard
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const salonId = auth.salonId;

    // Run all queries in parallel
    const [
      salonRes,
      statsRes,
      todayAppointmentsRes,
      missionsRes,
      recommendationsRes,
      metricsRes,
    ] = await Promise.all([
      // Salon info
      sqlOne(
        `SELECT name, owner_name, niche, goal FROM salons WHERE id = $1`,
        [salonId]
      ),

      // Customer stats
      sqlOne(
        `SELECT
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE status = 'vip') as vip_customers,
          COUNT(*) FILTER (WHERE status IN ('inactive', 'lost') AND last_visit_at IS NOT NULL) as inactive_customers,
          COUNT(*) FILTER (WHERE status = 'new') as new_customers,
          COUNT(*) FILTER (WHERE status = 'hot') as hot_customers,
          COUNT(*) FILTER (WHERE status = 'active') as active_customers,
          ROUND(AVG(average_ticket) FILTER (WHERE average_ticket > 0), 2) as avg_ticket
         FROM customers WHERE salon_id = $1`,
        [salonId]
      ),

      // Today's appointments
      sql(
        `SELECT a.*, 
          c.name as customer_name, c.phone as customer_phone,
          s.name as service_name, s.price,
          p.name as professional_name
         FROM appointments a
         LEFT JOIN customers c ON c.id = a.customer_id
         LEFT JOIN services s ON s.id = a.service_id
         LEFT JOIN professionals p ON p.id = a.professional_id
         WHERE a.salon_id = $1 
           AND DATE(a.start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
         ORDER BY a.start_time`,
        [salonId]
      ),

      // Today's missions
      sql(
        `SELECT * FROM daily_missions 
         WHERE salon_id = $1 AND due_date = CURRENT_DATE
         ORDER BY CASE status WHEN 'completed' THEN 1 ELSE 0 END ASC, points DESC`,
        [salonId]
      ),

      // Top AI recommendations
      sql(
        `SELECT * FROM ai_recommendations
         WHERE salon_id = $1 AND status = 'pending'
         ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END ASC
         LIMIT 3`,
        [salonId]
      ),

      // Last 14 days metrics
      sql(
        `SELECT date, revenue_estimated, new_customers, returning_customers, appointments_count, average_ticket
         FROM metrics_snapshots
         WHERE salon_id = $1 AND date >= CURRENT_DATE - INTERVAL '14 days'
         ORDER BY date ASC`,
        [salonId]
      ),
    ]);

    // Calculate estimated revenue today
    const todayRevenue = (todayAppointmentsRes as Array<{status: string; value: number}>)
      .filter((a) => a.status === 'attended')
      .reduce((sum: number, a) => sum + (a.value || 0), 0);

    // Active campaigns
    const activeCampaigns = await sqlOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM campaigns WHERE salon_id = $1 AND status = 'active'`,
      [salonId]
    );

    return NextResponse.json({
      salon: salonRes,
      stats: statsRes,
      today_appointments: todayAppointmentsRes,
      today_revenue: todayRevenue,
      missions: missionsRes,
      recommendations: recommendationsRes,
      metrics_history: metricsRes,
      active_campaigns: parseInt(activeCampaigns?.count || '0'),
    });
  } catch (err) {
    console.error('[API /dashboard]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
