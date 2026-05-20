import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { getDashboardIntelligence, computeAndSaveKpiSnapshot, computeGrowthHealthScore } from '@/services/growth-intelligence';
import { sqlOne } from '@/lib/db/neon';

// GET /api/intelligence/dashboard
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const salonId = auth.salonId;

    // Compute fresh weekly snapshot if not done today
    const lastSnapshot = await sqlOne(
      `SELECT id FROM salon_kpi_snapshots WHERE salon_id=$1 AND created_at::date = CURRENT_DATE`,
      [salonId]
    );

    let healthScore = null;
    if (!lastSnapshot) {
      const periodEnd = new Date();
      const periodStart = new Date(Date.now() - 7 * 86400000);
      healthScore = await computeAndSaveKpiSnapshot(salonId, periodStart, periodEnd);
    } else {
      // Read from last snapshot
      const snap = await sqlOne<Record<string, string>>(
        `SELECT * FROM salon_kpi_snapshots WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [salonId]
      );
      if (snap) {
        healthScore = computeGrowthHealthScore({
          newCustomers: parseInt(snap.new_customers_count ?? '0'),
          returningCustomers: parseInt(snap.returning_customers_count ?? '0'),
          inactiveCustomers: parseInt(snap.inactive_customers_count ?? '0'),
          noShowRate: parseFloat(snap.no_show_rate ?? '0'),
          avgTicket: parseFloat(snap.average_ticket ?? '0'),
          campaignResponseRate: parseFloat(snap.campaign_response_rate ?? '0'),
          totalAppointments: parseInt(snap.appointment_count ?? '0'),
        });
      }
    }

    const intelligence = await getDashboardIntelligence(salonId);

    return NextResponse.json({
      health_score: healthScore,
      ...intelligence,
    });
  } catch (err) {
    console.error('[API /intelligence/dashboard]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
