import { sql, sqlOne } from "@/lib/db/neon";
export async function businessContext(salonId: string) {
  const [salon, customers, appointments, services, knowledge, instagram] =
    await Promise.all([
      sqlOne(
        "SELECT name, city, niche, goal, instagram, timezone FROM salons WHERE id=$1",
        [salonId],
      ),
      sqlOne(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status IN ('inactive','lost'))::int AS inactive,
      COALESCE(SUM(total_spent),0) AS recorded_lifetime_spend,
      ROUND(AVG(average_ticket) FILTER(WHERE average_ticket>0),2) AS average_customer_ticket
      FROM customers WHERE salon_id=$1`,
        [salonId],
      ),
      sql(
        `SELECT status, COUNT(*)::int AS count FROM appointments
      WHERE salon_id=$1 AND start_time>=NOW()-INTERVAL '30 days' AND start_time<NOW()
      GROUP BY status`,
        [salonId],
      ),
      sql(
        "SELECT name, price, duration_minutes FROM services WHERE salon_id=$1 AND active=TRUE ORDER BY name LIMIT 50",
        [salonId],
      ),
      sqlOne(
        "SELECT business_knowledge, tone FROM salon_ai_settings WHERE salon_id=$1",
        [salonId],
      ),
      sqlOne(
        "SELECT username,source,profile,posts,collected_at FROM instagram_snapshots WHERE salon_id=$1 ORDER BY collected_at DESC LIMIT 1",
        [salonId],
      ),
    ]);
  return {
    as_of: new Date().toISOString(),
    period_days: 30,
    salon,
    customers,
    appointments,
    services,
    knowledge,
    instagram,
    limitations: [
      "Gasto acumulado de clientes não é faturamento do período nem lucro.",
      "Dados ausentes não significam zero. Não há custos e despesas neste contexto.",
      "Instagram representa somente a amostra coletada na data indicada; alcance, salvamentos e conversão podem estar indisponíveis.",
    ],
  };
}
