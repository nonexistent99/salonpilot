"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Lead } from "@/app/page";
import {
  Search,
  MapPin,
  Star,
  Globe,
  Phone,
  CalendarPlus,
  Eye,
  SlidersHorizontal,
  Loader2,
  Sparkles,
  ArrowUpDown,
  AlertCircle,
  Zap,
} from "lucide-react";

interface SearchSectionProps {
  onLeadSelect: (lead: Lead) => void;
}

function getScoreBadge(score: number) {
  if (score >= 75)
    return {
      label: "Alta",
      color: "bg-success/10 text-success border-success/20",
    };
  if (score >= 40)
    return {
      label: "Media",
      color: "bg-warning/10 text-warning border-warning/20",
    };
  return {
    label: "Baixa",
    color: "bg-muted text-muted-foreground border-border",
  };
}

export function SearchSection({ onLeadSelect }: SearchSectionProps) {
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [noWebsite, setNoWebsite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMeta, setSearchMeta] = useState<{
    new_count: number;
    searches_used: number;
    searches_limit: number;
  } | null>(null);
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<"score" | "rating">("score");

  // Existing saved leads count
  const { data: savedLeads } = useSWR<Lead[]>("/api/leads", fetcher);

  const handleSearch = async () => {
    if (!city || !niche) {
      setError("Preencha cidade e nicho para buscar.");
      return;
    }
    setError(null);
    setIsSearching(true);
    setSearchMeta(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, niche }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao buscar leads");
        setResults([]);
        return;
      }

      setResults(data.leads || []);
      setSearchMeta({
        new_count: data.new_count,
        searches_used: data.searches_used,
        searches_limit: data.searches_limit,
      });

      // Revalidate saved leads, dashboard, and credits
      mutate("/api/leads");
      mutate("/api/dashboard");
      mutate("/api/billing/credits");
    } catch {
      setError("Falha na conexao com o servidor");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateScript = async (lead: Lead) => {
    setGeneratingScriptId(lead.id);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-script`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao gerar script");
        return;
      }

      // Update the lead in results with the new script
      setResults((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, script: data.script } : l
        )
      );

      // Revalidate leads + credits
      mutate("/api/leads");
      mutate("/api/billing/credits");
    } catch {
      setError("Falha ao gerar script de IA");
    } finally {
      setGeneratingScriptId(null);
    }
  };

  // Apply client-side filters on already-fetched DB results
  let filtered = [...results];
  if (minRating > 0) filtered = filtered.filter((l) => l.rating >= minRating);
  if (noWebsite) filtered = filtered.filter((l) => !l.has_website);

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === "score")
      return (b.opportunity_score ?? b.score_ia) - (a.opportunity_score ?? a.score_ia);
    return b.rating - a.rating;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Search controls */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Engine de Oportunidades
          </h3>
          {searchMeta && (
            <span className="ml-auto text-xs text-muted-foreground">
              {searchMeta.searches_used}/{searchMeta.searches_limit} buscas
              usadas
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cidade (ex: Sao Paulo)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nicho (ex: Restaurante, Clinica)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-10 px-3 rounded-lg border border-border text-sm flex items-center gap-2 transition-all",
              showFilters
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar (1 cred.)
              </>
            )}
          </button>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t border-border">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                    Nota minima Google
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={0}>Qualquer</option>
                    <option value={3}>3.0+</option>
                    <option value={3.5}>3.5+</option>
                    <option value={4}>4.0+</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noWebsite}
                      onChange={(e) => setNoWebsite(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-foreground">
                      Apenas sem site
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Fechar
          </button>
        </motion.div>
      )}

      {/* Search meta info */}
      {searchMeta && results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">
              {filtered.length}
            </span>{" "}
            leads encontrados
            {searchMeta.new_count > 0 && (
              <span className="text-primary ml-1">
                ({searchMeta.new_count} novos)
              </span>
            )}
          </p>
          <button
            onClick={() =>
              setSortBy(sortBy === "score" ? "rating" : "score")
            }
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortBy === "score" ? "Por score" : "Por nota"}
          </button>
        </div>
      )}

      {/* Saved leads count */}
      {savedLeads && savedLeads.length > 0 && results.length === 0 && !isSearching && (
        <div className="text-xs text-muted-foreground">
          Voce tem{" "}
          <span className="text-foreground font-semibold">
            {savedLeads.length}
          </span>{" "}
          leads salvos no seu CRM
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((lead, index) => {
            const score = lead.opportunity_score ?? lead.score_ia;
            const badge = getScoreBadge(score);
            const reviewsNum = lead.reviews_count ?? lead.reviews ?? 0;

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                onClick={() => onLeadSelect(lead)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {lead.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {lead.niche} - {lead.city}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-medium border shrink-0 ml-2",
                      badge.color
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                    <span className="text-sm font-medium text-foreground">
                      {lead.rating}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {reviewsNum} avaliacoes
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      lead.has_website
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    <Globe className="w-3 h-3 inline mr-1" />
                    {lead.has_website ? "Com site" : "Sem site"}
                  </span>
                  {lead.phone && (
                    <span className="px-2 py-0.5 rounded text-xs bg-chart-2/10 text-chart-2">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {lead.phone}
                    </span>
                  )}
                </div>

                {/* Score bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      Score de oportunidade
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {score}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        score >= 75
                          ? "bg-success"
                          : score >= 40
                            ? "bg-warning"
                            : "bg-muted-foreground"
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeadSelect(lead);
                    }}
                    className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detalhes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateScript(lead);
                    }}
                    disabled={
                      generatingScriptId === lead.id || !!lead.script
                    }
                    className="h-8 px-3 rounded-lg bg-chart-2/10 text-chart-2 text-xs hover:bg-chart-2/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {generatingScriptId === lead.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    {lead.script ? "Script OK" : "Script (3 cred.)"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeadSelect(lead);
                    }}
                    className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Script preview if exists */}
                {lead.script && (
                  <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lead.script}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            Buscando leads...
          </h3>
          <p className="text-sm text-muted-foreground">
            Consultando base de empresas e salvando no seu CRM
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isSearching && results.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Busque leads na base
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Digite uma cidade e um nicho para encontrar empresas com
            oportunidades de marketing digital
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
