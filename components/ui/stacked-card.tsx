"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Box } from "lucide-react";
import { EASE_DEFAULT } from "@/lib/motion";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CardStatus = "active" | "draft" | "hidden";

interface StackedCardProps {
  title: string;
  subtitle?: string;
  price?: number | null;
  imageUrl?: string | null;
  imageAlt?: string;
  status?: CardStatus;
  optionsCount?: number;
  hasPriceFromPrefix?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const STATUS_LABEL: Record<CardStatus, string> = {
  active: "ATIVO",
  draft: "RASCUNHO",
  hidden: "OCULTO",
};

export function StackedCard({
  title,
  subtitle,
  price,
  imageUrl,
  imageAlt,
  status,
  optionsCount = 0,
  hasPriceFromPrefix = false,
  href,
  onClick,
  className,
}: StackedCardProps) {
  const isStacked = optionsCount > 1;
  const isDataUri = Boolean(imageUrl && imageUrl.startsWith("data:"));

  const cardInner = (
    <>
      <div
        onClick={href ? undefined : onClick}
        role={!href && onClick ? "button" : undefined}
        tabIndex={!href && onClick ? 0 : undefined}
        onKeyDown={
          !href && onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          "relative",
          !href &&
            onClick &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-[24px]"
        )}
      >
        {isStacked ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 translate-x-3.5 translate-y-2 rotate-[3.2deg] rounded-[24px] border border-[#CFD8EA] bg-surface/95 shadow-[0_6px_16px_rgba(14,22,48,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-6 group-hover:translate-y-3 group-hover:rotate-[5.5deg]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 translate-x-2 translate-y-1 rotate-[1.6deg] rounded-[24px] border border-[#D5DFEE] bg-surface shadow-[0_4px_12px_rgba(14,22,48,0.07)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3.5 group-hover:translate-y-1.5 group-hover:rotate-[2.8deg]"
            />
          </>
        ) : null}

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] border border-line/80 bg-surface shadow-card transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-[0_14px_34px_rgba(31,79,255,0.10)]">
          {imageUrl ? (
            isDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={imageAlt || title}
                className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
            ) : (
              <Image
                src={imageUrl}
                alt={imageAlt || title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
            )
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F3F6FC] via-[#FFFFFF] to-[#E6EEFF] p-6 text-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Box className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Modelo 3D
              </span>
            </div>
          )}

          {(status || isStacked) && (
            <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5">
              {status ? (
                <Badge variant={status}>{STATUS_LABEL[status]}</Badge>
              ) : null}
              {isStacked ? (
                <Badge variant="options">{optionsCount} OPÇÕES</Badge>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 px-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] font-bold leading-snug tracking-[-0.02em] text-ink line-clamp-2">
            {title}
          </h3>
          {price !== undefined ? (
            <span className="shrink-0 text-right text-sm font-bold text-ink tabular-nums">
              {hasPriceFromPrefix && price !== null ? (
                <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                  a partir de
                </span>
              ) : null}
              {formatCurrencyBRL(price)}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.32, ease: EASE_DEFAULT }}
      className={cn("group flex flex-col", className)}
    >
      {href ? (
        <Link
          href={href}
          className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-[24px]"
        >
          {cardInner}
        </Link>
      ) : (
        cardInner
      )}
    </motion.article>
  );
}
