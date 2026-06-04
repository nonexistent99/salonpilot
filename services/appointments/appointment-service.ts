import { sql, transaction } from '@/lib/db/neon';
import { listAvailableSlots, type AvailableSlot } from './availability-service';

type CreateAppointmentArgs = {
  salonId: string;
  customerId: string;
  serviceId: string;
  startTime: string;
  professionalId?: string | null;
  sourceThreadId?: string | null;
  notes?: string | null;
  createdByAiRunId?: string | null;
  source?: string;
};

type CreateAppointmentSuccess = {
  success: true;
  appointment_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  professional_name: string | null;
};

type CreateAppointmentFailure = {
  success: false;
  code: 'SLOT_UNAVAILABLE' | 'SERVICE_NOT_FOUND' | 'PROFESSIONAL_NOT_FOUND';
  message: string;
  alternative_slots?: AvailableSlot[];
};

function dateOnly(startTime: string): string {
  return startTime.slice(0, 10);
}

export async function createAppointment(args: CreateAppointmentArgs): Promise<CreateAppointmentSuccess | CreateAppointmentFailure> {
  const alternatives = await listAvailableSlots({
    salonId: args.salonId,
    serviceId: args.serviceId,
    date: dateOnly(args.startTime),
    professionalId: args.professionalId || null,
    limit: 6,
  });

  if (!alternatives.success) {
    return { success: false, code: 'SERVICE_NOT_FOUND', message: alternatives.message };
  }

  const requestedStart = new Date(args.startTime);
  const chosen = alternatives.available_slots.find((slot) => {
    const sameStart = Math.abs(new Date(slot.start_time).getTime() - requestedStart.getTime()) < 60_000;
    const sameProfessional = !args.professionalId || slot.professional_id === args.professionalId;
    return sameStart && sameProfessional;
  });

  if (!chosen) {
    return {
      success: false,
      code: 'SLOT_UNAVAILABLE',
      message: 'Esse horario ficou indisponivel.',
      alternative_slots: alternatives.available_slots,
    };
  }

  return transaction(async (client) => {
    const serviceResult = await client.query<{
      id: string;
      name: string;
      price: string;
      duration_minutes: number;
    }>(
      `SELECT id, name, price, duration_minutes
       FROM services
       WHERE salon_id = $1 AND id = $2 AND active = TRUE
       FOR UPDATE`,
      [args.salonId, args.serviceId]
    );

    const service = serviceResult.rows[0];
    if (!service) {
      return { success: false, code: 'SERVICE_NOT_FOUND', message: 'Servico nao encontrado.' } satisfies CreateAppointmentFailure;
    }

    const professionalResult = await client.query<{ id: string; name: string }>(
      `SELECT id, name
       FROM professionals
       WHERE salon_id = $1 AND id = $2 AND active = TRUE
       FOR UPDATE`,
      [args.salonId, chosen.professional_id]
    );

    const professional = professionalResult.rows[0];
    if (!professional) {
      return { success: false, code: 'PROFESSIONAL_NOT_FOUND', message: 'Profissional nao encontrado.' } satisfies CreateAppointmentFailure;
    }

    const conflict = await client.query(
      `SELECT id
       FROM appointments
       WHERE salon_id = $1
         AND professional_id = $2
         AND status IN ('scheduled', 'confirmed')
         AND start_time < $4::timestamptz
         AND COALESCE(end_time, start_time + make_interval(mins => $5::int)) > $3::timestamptz
       FOR UPDATE`,
      [args.salonId, professional.id, chosen.start_time, chosen.end_time, service.duration_minutes]
    );

    if (conflict.rowCount > 0) {
      return {
        success: false,
        code: 'SLOT_UNAVAILABLE',
        message: 'Esse horario ficou indisponivel.',
        alternative_slots: alternatives.available_slots.filter((slot) => slot.start_time !== chosen.start_time),
      } satisfies CreateAppointmentFailure;
    }

    const appointmentResult = await client.query<{
      id: string;
      start_time: string;
      end_time: string;
    }>(
      `INSERT INTO appointments (
         salon_id, customer_id, service_id, professional_id, start_time, end_time,
         status, source, source_thread_id, created_by_ai_run_id, notes, value
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $11, $7, $8, $9, $10)
       RETURNING id, start_time, end_time`,
      [
        args.salonId,
        args.customerId,
        service.id,
        professional.id,
        chosen.start_time,
        chosen.end_time,
        args.sourceThreadId || null,
        args.createdByAiRunId || null,
        args.notes || null,
        service.price || 0,
        args.source || 'ai_whatsapp',
      ]
    );

    const appointment = appointmentResult.rows[0];

    await client.query(
      `UPDATE customers
       SET status = 'scheduled',
           lifecycle_status = 'scheduled',
           lead_stage = 'scheduled',
           last_interest_service_id = $3,
           last_appointment_at = $4,
           updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, args.customerId, service.id, appointment.start_time]
    );

    if (args.sourceThreadId) {
      await client.query(
        `UPDATE conversation_threads
         SET appointment_id = $3,
             status = 'completed',
             lead_stage = 'scheduled',
             service_in_focus_id = $4,
             updated_at = NOW()
         WHERE salon_id = $1 AND id = $2`,
        [args.salonId, args.sourceThreadId, appointment.id, service.id]
      );
    }

    await client.query(
      `INSERT INTO lead_events (salon_id, customer_id, thread_id, event_type, service_id, appointment_id, metadata)
       VALUES ($1, $2, $3, 'appointment.created', $4, $5, $6::jsonb)`,
      [
        args.salonId,
        args.customerId,
        args.sourceThreadId || null,
        service.id,
        appointment.id,
        JSON.stringify({ source: 'ai_whatsapp' }),
      ]
    );

    await client.query(
      `INSERT INTO ai_usage_daily (salon_id, date, appointments_created_by_ai)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (salon_id, date)
       DO UPDATE SET appointments_created_by_ai = ai_usage_daily.appointments_created_by_ai + 1,
                     updated_at = NOW()`,
      [args.salonId]
    );

    return {
      success: true,
      appointment_id: appointment.id,
      service_name: service.name,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      professional_name: professional.name,
    } satisfies CreateAppointmentSuccess;
  });
}

export async function listAppointments(args: { salonId: string; date?: string | null }) {
  const params: unknown[] = [args.salonId];
  let whereDate = '';

  if (args.date) {
    params.push(args.date);
    whereDate = ` AND DATE(a.start_time AT TIME ZONE 'America/Sao_Paulo') = $2`;
  }

  return sql(
    `SELECT a.*,
            c.name as customer_name, c.phone as customer_phone,
            s.name as service_name, s.price as service_price,
            p.name as professional_name
     FROM appointments a
     LEFT JOIN customers c ON c.id = a.customer_id
     LEFT JOIN services s ON s.id = a.service_id
     LEFT JOIN professionals p ON p.id = a.professional_id
     WHERE a.salon_id = $1${whereDate}
     ORDER BY a.start_time`,
    params
  );
}
