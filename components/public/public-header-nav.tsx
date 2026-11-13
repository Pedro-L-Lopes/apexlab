"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/catalogo", label: "Catálogo" },
];

export function scrollPageToTop(options?: { smooth?: boolean }) {
  if (typeof window === "undefined") return;

  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const useSmooth = Boolean(options?.smooth) && !prefersReduced;
  const behavior: ScrollBehavior = useSmooth ? "smooth" : "auto";

  window.scrollTo({ top: 0, left: 0, behavior });

  if (!useSmooth) {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

interface PublicHomeBrandLinkProps {
  className?: string;
  children: React.ReactNode;
}

export function PublicHomeBrandLink({
  className,
  children,
}: PublicHomeBrandLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      event.preventDefault();
      scrollPageToTop({ smooth: true });
    }
  };

  return (
    <Link href="/" scroll={true} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}

export function PublicHeaderNav() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const prevPathnameRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (
      prevPathnameRef.current !== null &&
      prevPathnameRef.current !== pathname
    ) {
      scrollPageToTop({ smooth: false });
      const rafId = window.requestAnimationFrame(() => {
        scrollPageToTop({ smooth: false });
      });
      prevPathnameRef.current = pathname;
      return () => window.cancelAnimationFrame(rafId);
    }

    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-1 rounded-full border border-line/70 bg-[#E9EFF9]/70 p-1"
    >
      {LINKS.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href ||
              pathname.startsWith(`${link.href}/`) ||
              pathname.startsWith("/produto/");

        const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
          if (
            link.href === "/" &&
            (pathname === "/" || window.location.pathname === "/")
          ) {
            event.preventDefault();
            scrollPageToTop({ smooth: true });
          }
        };

        return (
          <Link
            key={link.href}
            href={link.href}
            scroll={true}
            onClick={handleClick}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="public-header-nav-indicator"
                aria-hidden="true"
                transition={shouldReduceMotion ? { duration: 0 } : SPRING_SNAPPY}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
              />
            ) : null}
            <span className="relative z-10">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
