import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.12em] text-accent">
          <span
            className="inline-block h-[2px] w-4 rounded-full bg-accent"
            aria-hidden="true"
          />
          <span>{eyebrow}</span>
        </p>
        <h1 className="mt-2 font-display text-[40px] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink sm:text-[56px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2.5 text-[15px] text-muted">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
