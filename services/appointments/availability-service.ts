import { sql, sqlOne } from '@/lib/db/neon';

export type AvailableSlot = {
  start_time: string;
  end_time: string;
  professional_id: string;
  professional_name: string;
  label: string;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
};

type ProfessionalRow = {
  id: string;
  name: string;
};

type WorkingHourRow = {
  professional_id: string | null;
  start_time: string;
  end_time: string;
};

function makeLocalDate(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 8)}-03:00`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlaps(start: Date, end: Date, busyStart: string, busyEnd: string): boolean {
  const busyStartDate = new Date(busyStart);
  const busyEndDate = new Date(busyEnd);
  return start < busyEndDate && end > busyStartDate;
}

function formatSlotLabel(start: Date, professionalName: string): string {
  return `${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} com ${professionalName}`;
}

export async function listAvailableSlots(args: {
  salonId: string;
  serviceId: string;
  date: string;
  professionalId?: string | null;
  limit?: number;
}): Promise<{ success: true; available_slots: AvailableSlot[] } | { success: false; message: string }> {
  const service = await sqlOne<ServiceRow>(
    `SELECT id, name, duration_minutes
     FROM services
     WHERE salon_id = $1 AND id = $2 AND active = TRUE`,
    [args.salonId, args.serviceId]
  );

  if (!service) return { success: false, message: 'Servico nao encontrado.' };

  const professionals = await sql<ProfessionalRow>(
    `SELECT DISTINCT p.id, p.name
     FROM professionals p
     WHERE p.salon_id = $1
       AND p.active = TRUE
       AND ($2::uuid IS NULL OR p.id = $2::uuid)
       AND (
         NOT EXISTS (SELECT 1 FROM professional_services ps WHERE ps.service_id = $3)
         OR EXISTS (
           SELECT 1 FROM professional_services ps
           WHERE ps.professional_id = p.id AND ps.service_id = $3
         )
       )
     ORDER BY p.name`,
    [args.salonId, args.professionalId || null, service.id]
  );

  if (professionals.length === 0) {
    return { success: true, available_slots: [] };
  }

  const weekday = makeLocalDate(args.date, '12:00:00').getDay();
  const workingHours = await sql<WorkingHourRow>(
    `SELECT professional_id, start_time::text, end_time::text
     FROM working_hours
     WHERE salon_id = $1 AND weekday = $2 AND active = TRUE
       AND (professional_id IS NULL OR professional_id = ANY($3::uuid[]))`,
    [args.salonId, weekday, professionals.map((p) => p.id)]
  );

  const dayStart = makeLocalDate(args.date, '00:00:00').toISOString();
  const dayEnd = makeLocalDate(args.date, '23:59:59').toISOString();

  const busyRows = await sql<{
    professional_id: string | null;
    start_time: string;
    end_time: string;
  }>(
    `SELECT professional_id, start_time, COALESCE(end_time, start_time + make_interval(mins => $2::int)) as end_time
     FROM appointments
     WHERE salon_id = $1
       AND status IN ('scheduled', 'confirmed')
       AND start_time < $4::timestamptz
       AND COALESCE(end_time, start_time + make_interval(mins => $2::int)) > $3::timestamptz
     UNION ALL
     SELECT professional_id, start_time, end_time
     FROM schedule_blocks
     WHERE salon_id = $1
       AND start_time < $4::timestamptz
       AND end_time > $3::timestamptz`,
    [args.salonId, service.duration_minutes, dayStart, dayEnd]
  );

  const slots: AvailableSlot[] = [];
  const limit = args.limit ?? 6;

  for (const professional of professionals) {
    const specificHours = workingHours.filter((h) => h.professional_id === professional.id);
    const generalHours = workingHours.filter((h) => h.professional_id === null);
    const hours = specificHours.length > 0 ? specificHours : generalHours;
    const dayHours = hours.length > 0 ? hours : [{ professional_id: null, start_time: '09:00:00', end_time: '18:00:00' }];

    for (const hour of dayHours) {
      let cursor = makeLocalDate(args.date, hour.start_time);
      const close = makeLocalDate(args.date, hour.end_time);

      while (addMinutes(cursor, service.duration_minutes) <= close) {
        const start = cursor;
        const end = addMinutes(start, service.duration_minutes);
        const isBusy = busyRows.some((row) => {
          if (row.professional_id && row.professional_id !== professional.id) return false;
          return overlaps(start, end, row.start_time, row.end_time);
        });

        if (!isBusy && start > new Date()) {
          slots.push({
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            professional_id: professional.id,
            professional_name: professional.name,
            label: formatSlotLabel(start, professional.name),
          });
        }

        if (slots.length >= limit) {
          return { success: true, available_slots: slots };
        }

        cursor = addMinutes(cursor, 30);
      }
    }
  }

  return { success: true, available_slots: slots };
}
