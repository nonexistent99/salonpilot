"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface GlassMetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  accent?: boolean;
}

export function GlassMetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  delay = 0,
  accent = false,
}: GlassMetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn(
        "group relative rounded-xl p-5 overflow-hidden transition-all duration-300",
        "glass-card hover:border-primary/30",
        accent && "border-primary/20 glow-accent"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">
            {title}
          </span>
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300",
            accent
              ? "bg-primary/10 text-primary"
              : "bg-secondary group-hover:bg-primary/10"
          )}>
            <Icon className={cn(
              "w-4 h-4 transition-colors duration-300",
              accent ? "text-primary" : "text-muted-foreground group-hover:text-primary"
            )} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {value}
          </span>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium mb-1",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" && <TrendingUp className="w-3.5 h-3.5" />}
              {changeType === "negative" && <TrendingDown className="w-3.5 h-3.5" />}
              <span>{change}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
