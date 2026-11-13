"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { SPRING_SNAPPY, EASE_DEFAULT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SwitchToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function SwitchToggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-[14px]",
        className
      )}
    >
      {label || description ? (
        <span className="min-w-0">
          {label ? (
            <span className="block text-sm font-semibold text-ink">{label}</span>
          ) : null}
          {description ? (
            <span className="block text-xs text-muted">{description}</span>
          ) : null}
        </span>
      ) : null}

      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
          checked ? "bg-accent" : "bg-[#D5DDF0]"
        )}
      >
        <motion.span
          layout
          transition={SPRING_SNAPPY}
          className={cn(
            "h-5 w-5 rounded-full bg-surface shadow-xs",
            checked ? "ml-auto" : "mr-auto"
          )}
        />
      </span>
    </button>
  );
}

interface SelectableChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableChip({
  selected,
  onClick,
  children,
  className,
}: SelectableChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        selected
          ? "bg-accent text-accent-foreground shadow-xs"
          : "border border-line bg-surface text-ink hover:border-accent/40 hover:bg-accent-soft",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = "Quantidade",
  className,
}: NumberStepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        aria-label="Diminuir"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <span className="min-w-6 text-center text-sm font-bold tabular-nums text-ink">
        {value}
      </span>

      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        aria-label="Aumentar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xs transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-[#E5ECFA]",
        className
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.35, ease: EASE_DEFAULT }}
        className="h-full rounded-full bg-accent"
      />
    </div>
  );
}
