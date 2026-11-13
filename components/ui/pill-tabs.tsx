"use client";

import * as React from "react";
import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface PillTabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface PillTabsProps<T extends string = string> {
  items: PillTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
  variant?: "rail" | "accent";
  className?: string;
}

export function PillTabs<T extends string = string>({
  items,
  value,
  onChange,
  layoutId = "pill-tabs-indicator",
  variant = "rail",
  className,
}: PillTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full p-1",
        variant === "rail"
          ? "bg-[#E9EFF9]/80 border border-line/70"
          : "bg-surface border border-line shadow-xs",
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive
                ? variant === "accent"
                  ? "text-accent-foreground"
                  : "text-ink"
                : "text-muted hover:text-ink"
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_SNAPPY}
                className={cn(
                  "absolute inset-0 rounded-full",
                  variant === "accent"
                    ? "bg-accent shadow-xs"
                    : "bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
                )}
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
            {item.count !== undefined ? (
              <span
                className={cn(
                  "relative z-10 text-[11px] font-medium tabular-nums",
                  isActive
                    ? variant === "accent"
                      ? "text-accent-foreground/85"
                      : "text-muted"
                    : "text-muted/75"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
