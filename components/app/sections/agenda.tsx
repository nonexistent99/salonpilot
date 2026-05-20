"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, RefreshCw,
  Phone, MapPin, Loader2, Star, Plus, X, CalendarDays, Search,
} from "lucide-react";

interface Meeting {
  id: string;
  lead_id: string;
  scheduled_at: string;
  status: string;
  notes: string;
  company_name?: string;
  phone?: string;
  rating?: number;
  leads?: { name: string; niche: string; phone: string } | null;
}

type Lead = {
  id: string;
  name: string;
  niche: string;
  phone: string;
  status: string;
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  scheduled: { icon: Clock, color: "text-chart-2", bg: "bg-chart-2/10", label: "Agendada" },
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Concluída" },
  no_show: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Não atendeu" },
  cancelled: { icon: RefreshCw, color: "text-warning", bg: "bg-warning/10", label: "Cancelada" },
};

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// New Meeting Modal
function NewMeetingModal({
  selectedDate,
  onClose,
  onCreated,
}: {
  selectedDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: leads } = useSWR<Lead[]>("/api/leads?status=all", fetcher);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");

  const filteredLeads = (leads || []).filter(
    (l) =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) &&
      l.status !== "closed_won" &&
      l.status !== "closed_lost"
  );

  const handleCreate = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${time}:00`).toISOString();
      await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          scheduled_at: scheduledAt,
          notes: notes || null,
          status: "scheduled",
        }),
      });
      onCreated();
    } catch (err) {
      console.error("Error creating meeting:", err);
    }
    setSaving(false);
  };

  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative glass-card rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Nova Reunião</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5 capitalize">{displayDate}</p>

        {/* Lead selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lead / Empresa</label>
          {selectedLead ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedLead.name}</p>
                <p className="text-xs text-muted-foreground">{selectedLead.niche}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar lead..."
                  autoFocus
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card/50">
                {filteredLeads.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">
                    {leads?.length === 0 ? "Nenhum lead cadastrado. Busque leads primeiro." : "Nenhum resultado."}
                  </p>
                ) : (
                  filteredLeads.slice(0, 20).map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => { setSelectedLead(lead); setLeadSearch(""); }}
                      className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-secondary/30 transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.niche}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Time */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Horário</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Apresentar proposta de gestão de redes sociais..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedLead || saving}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CalendarDays className="w-4 h-4" />
                Agendar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AgendaSection() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showNewMeeting, setShowNewMeeting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const { data: meetings, isLoading } = useSWR<Meeting[]>(
    `/api/meetings?date=${selectedDate}`,
    fetcher
  );

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const { data: monthMeetings } = useSWR<Meeting[]>(
    `/api/meetings?date_start=${monthStart}&date_end=${monthEnd}`,
    fetcher
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const meetingsByDate = (monthMeetings || []).reduce<Record<string, number>>((acc, m) => {
    const d = m.scheduled_at.slice(0, 10);
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const handleUpdateStatus = async (meetingId: string, status: string) => {
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate(`/api/meetings?date=${selectedDate}`);
    mutate(`/api/meetings?date_start=${monthStart}&date_end=${monthEnd}`);
    mutate("/api/dashboard");
  };

  const handleMeetingCreated = () => {
    setShowNewMeeting(false);
    mutate(`/api/meetings?date=${selectedDate}`);
    mutate(`/api/meetings?date_start=${monthStart}&date_end=${monthEnd}`);
    mutate("/api/dashboard");
    mutate("/api/leads");
  };

  const selectedMeetings = meetings || [];

  // Stats for the month
  const totalThisMonth = (monthMeetings || []).length;
  const completedThisMonth = (monthMeetings || []).filter((m) => m.status === "completed").length;
  const scheduledThisMonth = (monthMeetings || []).filter((m) => m.status === "scheduled").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Month stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-1">Total no mês</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{completedThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-1">Concluídas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-chart-2">{scheduledThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-1">Agendadas</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="lg:flex-1">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-foreground">
                {monthNames[month]} {year}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
              {days.map((day) => {
                const dateKey = formatDateKey(day);
                const meetingCount = meetingsByDate[dateKey] || 0;
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === todayStr;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateKey)}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all duration-200 relative",
                      isSelected ? "bg-primary text-primary-foreground font-semibold"
                        : isToday ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {day}
                    {meetingCount > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(meetingCount, 3) }).map((_, i) => (
                          <div key={i} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected day meetings */}
        <div className="lg:w-[400px]">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {selectedDate === todayStr ? "Hoje" : new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedMeetings.length} {selectedMeetings.length === 1 ? "reunião" : "reuniões"}
                </p>
              </div>
              <button
                onClick={() => setShowNewMeeting(true)}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Reunião
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {isLoading && (
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                </div>
              )}
              <AnimatePresence mode="wait">
                {!isLoading && selectedMeetings.length > 0 ? (
                  selectedMeetings.map((meeting, index) => {
                    const status = statusConfig[meeting.status] || statusConfig.scheduled;
                    const StatusIcon = status.icon;
                    const time = new Date(meeting.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                    return (
                      <motion.div
                        key={meeting.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/20 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {meeting.company_name || meeting.leads?.name || "Lead"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{meeting.leads?.niche}</span>
                              {meeting.rating && (
                                <span className="text-xs text-warning flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-warning" />
                                  {meeting.rating}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {time}
                              </span>
                            </div>
                          </div>
                          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", status.bg, status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </div>

                        {meeting.notes && (
                          <p className="text-xs text-muted-foreground mb-2 bg-secondary/20 p-2 rounded italic">
                            {meeting.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          {(meeting.phone || meeting.leads?.phone) && (
                            <a href={`tel:${meeting.phone || meeting.leads?.phone}`} className="h-7 px-2.5 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Ligar
                            </a>
                          )}
                          {meeting.status === "scheduled" && (
                            <button
                              onClick={() => handleUpdateStatus(meeting.id, "completed")}
                              className="h-7 px-2.5 rounded-md bg-success/10 text-success text-xs hover:bg-success/20 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Concluir
                            </button>
                          )}
                          {meeting.status === "scheduled" && (
                            <button
                              onClick={() => handleUpdateStatus(meeting.id, "no_show")}
                              className="h-7 px-2.5 rounded-md bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              No show
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : !isLoading ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma reunião neste dia</p>
                    <button
                      onClick={() => setShowNewMeeting(true)}
                      className="mt-3 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      + Agendar reunião
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* New meeting modal */}
      <AnimatePresence>
        {showNewMeeting && (
          <NewMeetingModal
            selectedDate={selectedDate}
            onClose={() => setShowNewMeeting(false)}
            onCreated={handleMeetingCreated}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
