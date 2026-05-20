"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Loader2,
  Users,
  Search,
  Coins,
  Shield,
  Ban,
  CheckCircle2,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  agency_id: string;
  onboarding_completed: boolean;
  created_at: string;
  subscription: {
    plan: string;
    status: string;
    searches_used: number;
    ai_credits_used: number;
    music_used: number;
  } | null;
  credits: number;
}

function AddCreditsModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!amount) return;
    setLoading(true);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, action: "add_credits", value: String(amount) }),
    });
    mutate("/api/admin/users");
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Adicionar Creditos - {user.full_name || user.email}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Saldo atual: {user.credits} creditos
        </p>
        <div className="flex gap-2 mb-4">
          {[100, 500, 1000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all",
                amount === v
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/60"
              )}
            >
              +{v}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            placeholder="Valor customizado"
            className="flex-1 h-10 px-3 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!amount || loading}
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          Adicionar {amount > 0 ? `+${amount}` : ""} creditos
        </button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { data, isLoading } = useSWR("/api/admin/users", fetcher);
  const [search, setSearch] = useState("");
  const [creditModal, setCreditModal] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (userId: string, action: string, value?: string) => {
    setActionLoading(userId + action);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, value }),
    });
    mutate("/api/admin/users");
    setActionLoading(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const users: User[] = data?.users || [];
  const filtered = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} usuarios registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Usuario
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Plano
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Creditos
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Criado em
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {user.full_name || "Sem nome"}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      {user.role === "admin" && (
                        <span className="inline-flex self-start mt-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-destructive/10 text-destructive border border-destructive/20">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select
                        value={user.subscription?.plan || "free"}
                        onChange={(e) => handleAction(user.id, "change_plan", e.target.value)}
                        className="appearance-none bg-secondary/30 border border-border rounded-md px-2.5 py-1 text-xs font-medium text-foreground pr-6 cursor-pointer"
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-foreground">{user.credits}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
                        user.subscription?.status === "active"
                          ? "bg-chart-1/10 text-chart-1 border-chart-1/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {user.subscription?.status === "active" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Ban className="w-3 h-3" />
                      )}
                      {user.subscription?.status || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setCreditModal(user)}
                        className="h-7 px-2.5 rounded-md bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors flex items-center gap-1"
                      >
                        <Coins className="w-3 h-3" />
                        Creditos
                      </button>
                      {user.subscription?.status === "active" ? (
                        <button
                          onClick={() => handleAction(user.id, "deactivate")}
                          disabled={actionLoading === user.id + "deactivate"}
                          className="h-7 px-2.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(user.id, "activate")}
                          disabled={actionLoading === user.id + "activate"}
                          className="h-7 px-2.5 rounded-md bg-chart-1/10 text-chart-1 text-xs font-medium hover:bg-chart-1/20 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Ativar
                        </button>
                      )}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => handleAction(user.id, "change_role", "admin")}
                          className="h-7 px-2.5 rounded-md bg-chart-5/10 text-chart-5 text-xs font-medium hover:bg-chart-5/20 transition-colors flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creditModal && (
        <AddCreditsModal user={creditModal} onClose={() => setCreditModal(null)} />
      )}
    </div>
  );
}
