"use client";
// Note: pg driver returns numeric/decimal columns as strings — always parse with parseFloat/parseInt

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Users, Search, Plus, Filter, Phone, Instagram, Star,
  AlertCircle, Zap, Clock, ChevronRight, X, Upload, MessageCircle, Tag
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  vip: { label: "VIP", color: "text-amber-700", bg: "bg-amber-100" },
  active: { label: "Ativa", color: "text-green-700", bg: "bg-green-100" },
  new: { label: "Nova", color: "text-blue-700", bg: "bg-blue-100" },
  inactive: { label: "Sumida", color: "text-red-700", bg: "bg-red-100" },
  lost: { label: "Perdida", color: "text-gray-700", bg: "bg-gray-100" },
  hot: { label: "Quente", color: "text-orange-700", bg: "bg-orange-100" },
  cold: { label: "Fria", color: "text-slate-700", bg: "bg-slate-100" },
  at_risk: { label: "Em risco", color: "text-yellow-700", bg: "bg-yellow-100" },
  scheduled: { label: "Agendada", color: "text-teal-700", bg: "bg-teal-100" },
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "vip", label: "VIP" },
  { value: "active", label: "Ativas" },
  { value: "new", label: "Novas" },
  { value: "inactive", label: "Sumidas" },
  { value: "hot", label: "Quentes" },
];

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  status: string;
  last_visit_at: string | null;
  total_spent: number;
  average_ticket: number;
  visit_count: number;
  tags: Array<{ id: string; name: string; color: string }>;
};

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function AddCustomerModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", instagram: "", email: "", source: "whatsapp" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Adicionar Cliente</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          {[
            { key: "name", label: "Nome *", placeholder: "Nome da cliente", required: true },
            { key: "phone", label: "WhatsApp", placeholder: "(11) 99999-9999" },
            { key: "instagram", label: "Instagram", placeholder: "@usuario" },
            { key: "email", label: "E-mail", placeholder: "email@exemplo.com" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
            <select
              value={form.source}
              onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["referral", "Indicação"], ["organic", "Orgânico"], ["manual", "Manual"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, mutate } = useSWR(
    `/api/customers?search=${encodeURIComponent(search)}&status=${statusFilter}&limit=100`,
    fetcher,
    { keepPreviousData: true }
  );

  const customers: Customer[] = data?.customers || [];
  const total: number = data?.total || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{total} clientes cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all glow-primary"
          >
            <Plus className="w-4 h-4" />
            Adicionar cliente
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value === statusFilter ? "" : f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: Users, color: "text-foreground", bg: "bg-muted/50" },
          { label: "Sumidas", value: customers.filter(c => c.status === "inactive").length, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "VIP", value: customers.filter(c => c.status === "vip").length, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Novas", value: customers.filter(c => c.status === "new").length, icon: Zap, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
            <Icon className={`w-4.5 h-4.5 ${color}`} />
            <div>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Customer list */}
      <div className="glass-card rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || statusFilter ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada"}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-sm text-primary font-medium hover:underline"
              >
                Adicionar primeira cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Contato</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">Última visita</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">Total gasto</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">Ticket</th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => {
                  const statusConfig = STATUS_LABELS[customer.status] || STATUS_LABELS.active;
                  const days = daysSince(customer.last_visit_at);

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-pink-300/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                            {customer.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {customer.tags.slice(0, 2).map(tag => (
                                  <span
                                    key={tag.id}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                                    style={{ background: `${tag.color}20`, color: tag.color }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {customer.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {customer.phone}
                            </p>
                          )}
                          {customer.instagram && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Instagram className="w-3 h-3" /> {customer.instagram}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Last visit */}
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                        {days !== null ? (
                          <span className={`text-xs font-medium ${days > 45 ? "text-red-500" : days > 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {days === 0 ? "Hoje" : `${days}d atrás`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>

                      {/* Total spent */}
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                        <span className="text-sm font-semibold text-foreground">
                          R$ {parseFloat(String(customer.total_spent || 0)).toFixed(0)}
                        </span>
                      </td>

                      {/* Avg ticket */}
                      <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          R$ {parseFloat(String(customer.average_ticket || 0)).toFixed(0)}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-3 py-3.5">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAdd && (
        <AddCustomerModal onClose={() => setShowAdd(false)} onSave={() => mutate()} />
      )}
    </div>
  );
}
