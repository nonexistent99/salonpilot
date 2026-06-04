import { sql, sqlOne } from '@/lib/db/neon';
import { listClientMemories } from '@/services/crm/memory-service';

export type ThreadContext = {
  thread: {
    id: string;
    salon_id: string;
    customer_id: string;
    whatsapp_account_id: string | null;
    phone: string | null;
    ai_enabled: boolean;
    status: string;
    lead_stage: string | null;
    service_in_focus_id: string | null;
    appointment_id: string | null;
    summary: string | null;
    previous_response_id: string | null;
  };
  salon: {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    instagram: string | null;
    timezone: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp_phone: string | null;
    lead_stage: string | null;
    lifecycle_status: string | null;
    notes: string | null;
  };
  contextText: string;
};

function getLocalDateParts(timeZone: string) {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => dateParts.find((item) => item.type === type)?.value || '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;

  return {
    nowIso: now.toISOString(),
    today,
    localTime: new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now),
    weekday: new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      weekday: 'long',
    }).format(now),
  };
}

export async function composeCustomerContext(args: { salonId: string; threadId: string }): Promise<ThreadContext> {
  const thread = await sqlOne<ThreadContext['thread']>(
    `SELECT id, salon_id, customer_id, whatsapp_account_id, phone, ai_enabled, status,
            lead_stage, service_in_focus_id, appointment_id, summary, previous_response_id
     FROM conversation_threads
     WHERE salon_id = $1 AND id = $2`,
    [args.salonId, args.threadId]
  );

  if (!thread) throw new Error('Thread not found');

  const [salon, customer, services, recentMessages] = await Promise.all([
    sqlOne<ThreadContext['salon']>(
      `SELECT id, name, city, phone, instagram, COALESCE(timezone, 'America/Sao_Paulo') as timezone
       FROM salons
       WHERE id = $1`,
      [args.salonId]
    ),
    sqlOne<ThreadContext['customer']>(
      `SELECT id, name, phone, whatsapp_phone, lead_stage, lifecycle_status, notes
       FROM customers
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, thread.customer_id]
    ),
    sql(
      `SELECT id, name, description, price, duration_minutes
       FROM services
       WHERE salon_id = $1 AND active = TRUE
       ORDER BY name
       LIMIT 20`,
      [args.salonId]
    ),
    sql(
      `SELECT direction, sender_type, content, message_type, created_at
       FROM messages
       WHERE thread_id = $1
       ORDER BY created_at DESC
       LIMIT 12`,
      [args.threadId]
    ),
  ]);

  if (!salon || !customer) throw new Error('Salon or customer not found');

  const timeZone = salon.timezone || 'America/Sao_Paulo';
  const localDate = getLocalDateParts(timeZone);

  const memories = await listClientMemories({
    salonId: args.salonId,
    customerId: customer.id,
    limit: 6,
  });

  const serviceFocus = thread.service_in_focus_id
    ? services.find((service: any) => service.id === thread.service_in_focus_id)
    : null;

  const contextText = [
    `Salao: ${salon.name}${salon.city ? `, ${salon.city}` : ''}`,
    `Data/hora atual: ${localDate.today} ${localDate.localTime} (${localDate.weekday}); timezone: ${timeZone}; now_iso: ${localDate.nowIso}`,
    `Cliente: ${customer.name} (${customer.whatsapp_phone || customer.phone || 'sem telefone'})`,
    `Lead stage: ${thread.lead_stage || customer.lead_stage || 'new'}`,
    `Status da conversa: ${thread.status}; IA ativa: ${thread.ai_enabled ? 'sim' : 'nao'}`,
    thread.summary ? `Resumo anterior: ${thread.summary}` : null,
    serviceFocus ? `Servico em foco: ${serviceFocus.name} (${serviceFocus.duration_minutes} min, R$ ${serviceFocus.price})` : null,
    customer.notes ? `Notas da cliente: ${customer.notes}` : null,
    memories.length ? `Memorias: ${memories.map((m: any) => `${m.type}: ${m.content}`).join(' | ')}` : null,
    `Servicos ativos: ${services.map((s: any) => `${s.name} [id=${s.id}, R$ ${s.price}, ${s.duration_minutes}min]`).join('; ') || 'nenhum cadastrado'}`,
    `Ultimas mensagens: ${recentMessages.reverse().map((m: any) => `${m.direction}/${m.sender_type}: ${m.content || `[${m.message_type}]`}`).join('\n')}`,
  ].filter(Boolean).join('\n');

  return { thread, salon, customer, contextText };
}
