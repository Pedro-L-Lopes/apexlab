"use client";

import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type GridDensity = 3 | 4 | 5;

interface DensitySelectorProps {
  value: GridDensity;
  onChange: (density: GridDensity) => void;
  layoutId?: string;
  className?: string;
}

const OPTIONS: GridDensity[] = [3, 4, 5];

export function DensitySelector({
  value,
  onChange,
  layoutId = "density-selector-indicator",
  className,
}: DensitySelectorProps) {
  return (
    <div
      role="group"
      aria-label="Densidade da grade"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line/70 bg-[#E9EFF9]/80 p-1",
        className
      )}
    >
      {OPTIONS.map((cols) => {
        const isActive = value === cols;
        return (
          <button
            key={cols}
            type="button"
            onClick={() => onChange(cols)}
            aria-label={`${cols} colunas`}
            aria-pressed={isActive}
            className={cn(
              "relative flex h-8 items-center justify-center rounded-full px-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive ? "text-accent" : "text-muted hover:text-ink"
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_SNAPPY}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
              />
            ) : null}
            <span
              className="relative z-10 flex items-center gap-[2px]"
              aria-hidden="true"
            >
              {Array.from({ length: cols }).map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-3 w-[2.5px] rounded-full transition-colors",
                    isActive ? "bg-accent" : "bg-current opacity-70"
                  )}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
