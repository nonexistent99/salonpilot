"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User, Scissors } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-200 text-blue-700",
  confirmed: "bg-green-100 border-green-200 text-green-700",
  attended: "bg-primary/10 border-primary/20 text-primary",
  no_show: "bg-red-100 border-red-200 text-red-600",
  canceled: "bg-muted border-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  attended: "Atendida",
  no_show: "Faltou",
  canceled: "Cancelado",
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h

export function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const { data } = useSWR(`/api/appointments?date=${dateStr}`, fetcher);
  const appointments = data?.appointments || [];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todayAppointments = appointments.filter((apt: { start_time: string }) =>
    isSameDay(new Date(apt.start_time), currentDate)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "day" ? "Dia" : "Semana"}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 glow-primary">
            <Plus className="w-4 h-4" />
            Agendar
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setCurrentDate(day)}
                className={`flex flex-col items-center w-10 py-2 rounded-xl transition-all ${
                  isSameDay(day, currentDate)
                    ? "bg-primary text-primary-foreground"
                    : isSameDay(day, new Date())
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-[10px] font-medium">{format(day, "EEE", { locale: ptBR }).toUpperCase()}</span>
                <span className="text-sm font-bold">{format(day, "d")}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Time grid for day view */}
        <div className="space-y-1">
          {HOURS.map((hour) => {
            const hourAppointments = todayAppointments.filter((apt: { start_time: string }) => {
              const aptHour = new Date(apt.start_time).getHours();
              return aptHour === hour;
            });

            return (
              <div key={hour} className="flex gap-3 min-h-[52px]">
                <div className="w-12 text-xs text-muted-foreground text-right pt-1 shrink-0">
                  {hour}:00
                </div>
                <div className="flex-1 border-t border-border/50 pt-1">
                  {hourAppointments.length > 0 ? (
                    <div className="space-y-1">
                      {hourAppointments.map((apt: {
                        id: string;
                        customer_name: string;
                        service_name: string;
                        professional_name: string;
                        status: string;
                        value: number;
                        start_time: string;
                      }) => (
                        <div
                          key={apt.id}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span className="font-semibold">{apt.customer_name || "Cliente"}</span>
                            <span className="opacity-60">•</span>
                            <span>{apt.service_name || "Serviço"}</span>
                            {apt.value > 0 && (
                              <>
                                <span className="opacity-60">•</span>
                                <span>R$ {apt.value.toFixed(0)}</span>
                              </>
                            )}
                            <span className="ml-auto opacity-60">{STATUS_LABELS[apt.status]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-10 border border-dashed border-border/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                      <span className="text-xs text-muted-foreground">+ Adicionar</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total hoje", value: todayAppointments.length, color: "text-foreground" },
          { label: "Confirmados", value: todayAppointments.filter((a: {status: string}) => a.status === "confirmed").length, color: "text-green-600" },
          { label: "Aguardando", value: todayAppointments.filter((a: {status: string}) => a.status === "scheduled").length, color: "text-blue-600" },
          { label: "Atendidas", value: todayAppointments.filter((a: {status: string}) => a.status === "attended").length, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
