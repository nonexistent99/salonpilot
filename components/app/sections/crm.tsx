"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Users, Phone, CalendarCheck, FileText, CheckCircle2, XCircle,
  Loader2, GripVertical, Star, Globe, Instagram, ChevronDown,
  Sparkles, ArrowRight, DollarSign, X,
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  niche: string;
  city: string;
  phone: string;
  rating: number;
  reviews: number;
  has_website: boolean;
  instagram_active: boolean;
  score_ia: number;
  status: string;
  created_at: string;
  script?: string;
};

const PIPELINE_COLUMNS = [
  { id: "new", label: "Novos", icon: Users, color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/20" },
  { id: "contacted", label: "Contatados", icon: Phone, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  { id: "meeting_scheduled", label: "Reunião Agendada", icon: CalendarCheck, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  { id: "proposal_sent", label: "Proposta Enviada", icon: FileText, color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/20" },
  { id: "closed_won", label: "Fechado ✓", icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  { id: "closed_lost", label: "Perdido", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
];

// Simple DealValueModal
function DealValueModal({ lead, onConfirm, onCancel }: { lead: Lead; onConfirm: (value: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative glass-card rounded-xl p-6 w-full max-w-sm mx-4"
      >
        <button onClick={onCancel} className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-success" />
          <h3 className="text-base font-semibold text-foreground">Fechar Venda</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Valor do contrato com <span className="text-foreground font-medium">{lead.name}</span>:
        </p>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-success/30 focus:border-success/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(Number(value) || 0)}
            className="flex-1 h-10 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CRMSection() {
  const { data: leads, isLoading } = useSWR<Lead[]>("/api/leads", fetcher, { refreshInterval: 15000 });
  const [draggingLead, setDraggingLead] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dealModal, setDealModal] = useState<Lead | null>(null);
  const [pendingMove, setPendingMove] = useState<{ leadId: string; status: string } | null>(null);
  const [movingLead, setMovingLead] = useState<string | null>(null);

  // Group leads by status
  const leadsByStatus: Record<string, Lead[]> = {};
  PIPELINE_COLUMNS.forEach((col) => {
    leadsByStatus[col.id] = [];
  });
  (leads || []).forEach((lead) => {
    const status = leadsByStatus[lead.status] ? lead.status : "new";
    leadsByStatus[status].push(lead);
  });

  const moveLead = useCallback(async (leadId: string, newStatus: string, dealValue?: number) => {
    setMovingLead(leadId);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, deal_value: dealValue }),
      });
      mutate("/api/leads");
      mutate("/api/dashboard");
      mutate("/api/deals");
    } catch (err) {
      console.error("Error moving lead:", err);
    }
    setMovingLead(null);
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    setDraggingLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    setDraggingLead(null);
    setDragOverCol(null);

    if (!leadId) return;
    const lead = (leads || []).find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    if (newStatus === "closed_won") {
      setDealModal(lead);
      setPendingMove({ leadId, status: newStatus });
    } else {
      moveLead(leadId, newStatus);
    }
  };

  const handleDealConfirm = (value: number) => {
    if (pendingMove) {
      moveLead(pendingMove.leadId, pendingMove.status, value);
    }
    setDealModal(null);
    setPendingMove(null);
  };

  // Quick move button
  const handleQuickMove = (lead: Lead, newStatus: string) => {
    if (newStatus === "closed_won") {
      setDealModal(lead);
      setPendingMove({ leadId: lead.id, status: newStatus });
    } else {
      moveLead(lead.id, newStatus);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const idx = PIPELINE_COLUMNS.findIndex((c) => c.id === current);
    if (idx < 0 || idx >= PIPELINE_COLUMNS.length - 2) return null; // skip closed_lost
    return PIPELINE_COLUMNS[idx + 1].id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalLeads = (leads || []).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Funil de Vendas</h2>
          <p className="text-sm text-muted-foreground">{totalLeads} leads no pipeline</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="w-3.5 h-3.5" />
          Arraste os cards para mover no funil
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {PIPELINE_COLUMNS.map((col) => {
          const ColIcon = col.icon;
          const colLeads = leadsByStatus[col.id] || [];
          const isDragOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={cn(
                "flex-shrink-0 w-[280px] rounded-xl border transition-all duration-200 flex flex-col",
                isDragOver
                  ? `${col.border} bg-${col.id === "closed_won" ? "success" : "primary"}/5`
                  : "border-border bg-card/30"
              )}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", col.bg)}>
                    <ColIcon className={cn("w-3.5 h-3.5", col.color)} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                </div>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", col.bg, col.color)}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                <AnimatePresence>
                  {colLeads.map((lead) => {
                    const nextStatus = getNextStatus(lead.status);
                    const isMoving = movingLead === lead.id;
                    const isDragging = draggingLead === lead.id;

                    return (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        draggable
                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, lead.id)}
                        onDragEnd={() => { setDraggingLead(null); setDragOverCol(null); }}
                        className={cn(
                          "group p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing",
                          isMoving && "opacity-50 pointer-events-none"
                        )}
                      >
                        {/* Lead name + score */}
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-sm font-medium text-foreground truncate flex-1 pr-2">{lead.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {lead.score_ia > 0 && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {lead.score_ia}
                              </span>
                            )}
                            <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                          {lead.niche && <span className="truncate max-w-[100px]">{lead.niche}</span>}
                          {lead.city && <span className="truncate max-w-[80px]">📍{lead.city}</span>}
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {lead.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                              <Star className="w-2.5 h-2.5 fill-warning" />
                              {lead.rating}
                            </span>
                          )}
                          {lead.has_website && (
                            <span className="flex items-center gap-0.5 text-[10px] text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded">
                              <Globe className="w-2.5 h-2.5" />
                              Site
                            </span>
                          )}
                          {lead.instagram_active && (
                            <span className="flex items-center gap-0.5 text-[10px] text-chart-5 bg-chart-5/10 px-1.5 py-0.5 rounded">
                              <Instagram className="w-2.5 h-2.5" />
                              IG
                            </span>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors">
                              <Phone className="w-2.5 h-2.5" />
                              Ligar
                            </a>
                          )}
                        </div>

                        {/* Quick move button */}
                        {nextStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQuickMove(lead, nextStatus); }}
                            disabled={isMoving}
                            className="w-full h-7 rounded-md bg-primary/5 border border-primary/10 text-primary text-[10px] font-medium hover:bg-primary/10 transition-all flex items-center justify-center gap-1"
                          >
                            {isMoving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <ArrowRight className="w-3 h-3" />
                                Mover para {PIPELINE_COLUMNS.find((c) => c.id === nextStatus)?.label}
                              </>
                            )}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colLeads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <p className="text-xs text-muted-foreground/50 text-center">
                      {isDragOver ? "Solte aqui" : "Nenhum lead"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal value modal */}
      <AnimatePresence>
        {dealModal && (
          <DealValueModal
            lead={dealModal}
            onConfirm={handleDealConfirm}
            onCancel={() => { setDealModal(null); setPendingMove(null); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
