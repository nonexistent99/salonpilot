import { sql, sqlOne } from '@/lib/db/neon';

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

export function phoneFromJid(remoteJid: string | null | undefined): string {
  if (!remoteJid) return '';
  return normalizePhone(remoteJid.split('@')[0]);
}

export async function findOrCreateCustomerByPhone(args: {
  salonId: string;
  phone: string;
  name?: string | null;
  source?: string;
}) {
  const phone = normalizePhone(args.phone);
  const existing = await sqlOne<{
    id: string;
    name: string;
    phone: string | null;
    whatsapp_phone: string | null;
  }>(
    `SELECT id, name, phone, whatsapp_phone
     FROM customers
     WHERE salon_id = $1
       AND (whatsapp_phone = $2 OR regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $2)
     ORDER BY updated_at DESC
     LIMIT 1`,
    [args.salonId, phone]
  );

  if (existing) {
    await sql(
      `UPDATE customers
       SET whatsapp_phone = COALESCE(whatsapp_phone, $3),
           phone = COALESCE(phone, $3),
           last_contact_at = NOW(),
           updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, existing.id, phone]
    );
    return existing;
  }

  return sqlOne(
    `INSERT INTO customers (salon_id, name, phone, whatsapp_phone, source, origin, status, lifecycle_status, lead_stage, last_contact_at)
     VALUES ($1, $2, $3, $3, $4, $4, 'new', 'new', 'new', NOW())
     RETURNING id, name, phone, whatsapp_phone`,
    [args.salonId, args.name || `Cliente ${phone.slice(-4)}`, phone, args.source || 'whatsapp']
  );
}

export async function saveLeadStatus(args: {
  salonId: string;
  customerId: string;
  threadId?: string | null;
  leadStage: string;
  serviceInterest?: string | null;
  notes?: string | null;
}) {
  let serviceId: string | null = null;

  if (args.serviceInterest) {
    const service = await sqlOne<{ id: string }>(
      `SELECT id
       FROM services
       WHERE salon_id = $1 AND (id::text = $2 OR name ILIKE $2)
       ORDER BY active DESC
       LIMIT 1`,
      [args.salonId, args.serviceInterest]
    );
    serviceId = service?.id || null;
  }

  await sql(
    `UPDATE customers
     SET lead_stage = $3,
         lifecycle_status = CASE WHEN $3 = 'scheduled' THEN 'scheduled' ELSE lifecycle_status END,
         last_interest_service_id = COALESCE($4::uuid, last_interest_service_id),
         notes = COALESCE(NULLIF($5, ''), notes),
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2`,
    [args.salonId, args.customerId, args.leadStage, serviceId, args.notes || null]
  );

  if (args.threadId) {
    await sql(
      `UPDATE conversation_threads
       SET lead_stage = $3,
           service_in_focus_id = COALESCE($4::uuid, service_in_focus_id),
           updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, args.threadId, args.leadStage, serviceId]
    );
  }

  await sql(
    `INSERT INTO lead_events (salon_id, customer_id, thread_id, event_type, service_id, metadata)
     VALUES ($1, $2, $3, 'lead.status_updated', $4, $5::jsonb)`,
    [
      args.salonId,
      args.customerId,
      args.threadId || null,
      serviceId,
      JSON.stringify({ lead_stage: args.leadStage, notes: args.notes || null }),
    ]
  );

  return { success: true, service_id: serviceId };
}
