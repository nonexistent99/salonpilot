import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne, transaction } from '@/lib/db/neon';
import { assistantProfileSchema, getAssistantProfile } from '@/lib/assistant-profile';

const setupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  instagram: z.string().trim().max(120),
  timezone: z.string().trim().default('America/Sao_Paulo'),
  goal: z.string().trim().min(3).max(400),
  profile: assistantProfileSchema,
  services: z.array(z.object({ name: z.string().trim().min(2).max(120), price: z.number().min(0).max(100000), duration: z.number().int().min(10).max(600) })).min(1).max(30),
  hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine(v => v.start < v.end)).min(1).max(7),
});

export async function GET() {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const [salon, profile, services, hours] = await Promise.all([
    sqlOne(`SELECT name, city, instagram, timezone, goal, onboarding_completed FROM salons WHERE id = $1`, [auth.salonId]),
    getAssistantProfile(auth.salonId),
    sql(`SELECT name, price, duration_minutes AS duration FROM services WHERE salon_id = $1 AND active = TRUE ORDER BY name`, [auth.salonId]),
    sql(`SELECT weekday, to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"
         FROM working_hours WHERE salon_id = $1 AND professional_id IS NULL AND active = TRUE ORDER BY weekday`, [auth.salonId]),
  ]);
  return NextResponse.json({ salon, profile, services, hours });
}

export async function PUT(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Confira os dados do salão, serviços, horários e regras da IA.' }, { status: 400 });
  const data = parsed.data;
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: data.timezone }); }
  catch { return NextResponse.json({ error: 'Fuso horário inválido.' }, { status: 400 }); }
  if (new Set(data.services.map(s => s.name.toLowerCase())).size !== data.services.length ||
      new Set(data.hours.map(h => h.weekday)).size !== data.hours.length) {
    return NextResponse.json({ error: 'Serviços e dias da semana não podem estar repetidos.' }, { status: 400 });
  }
  await transaction(async client => {
    await client.query(`UPDATE salons SET name=$2, city=$3, instagram=$4, timezone=$5, goal=$6,
      onboarding_completed=TRUE, updated_at=NOW() WHERE id=$1`, [auth.salonId, data.name, data.city, data.instagram, data.timezone, data.goal]);
    await client.query(`INSERT INTO salon_settings (salon_id, key, value_json) VALUES ($1, 'assistant_profile', $2::jsonb)
      ON CONFLICT (salon_id, key) DO UPDATE SET value_json=EXCLUDED.value_json, updated_at=NOW()`, [auth.salonId, JSON.stringify(data.profile)]);
    await client.query(`UPDATE services SET active=FALSE, updated_at=NOW() WHERE salon_id=$1`, [auth.salonId]);
    for (const service of data.services) {
      const existing = await client.query(`SELECT id FROM services WHERE salon_id=$1 AND lower(name)=lower($2) ORDER BY created_at LIMIT 1`, [auth.salonId, service.name]);
      if (existing.rows[0]) await client.query(`UPDATE services SET name=$3, price=$4, duration_minutes=$5, active=TRUE, updated_at=NOW() WHERE id=$1 AND salon_id=$2`, [existing.rows[0].id, auth.salonId, service.name, service.price, service.duration]);
      else await client.query(`INSERT INTO services (salon_id, name, price, duration_minutes) VALUES ($1,$2,$3,$4)`, [auth.salonId, service.name, service.price, service.duration]);
    }
    await client.query(`DELETE FROM working_hours WHERE salon_id=$1 AND professional_id IS NULL`, [auth.salonId]);
    for (const h of data.hours) await client.query(`INSERT INTO working_hours (salon_id, weekday, start_time, end_time) VALUES ($1,$2,$3,$4)`, [auth.salonId, h.weekday, h.start, h.end]);
  });
  return NextResponse.json({ ok: true, ai_enabled: data.profile.enabled });
}
