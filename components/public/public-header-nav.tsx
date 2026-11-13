"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/catalogo", label: "Catálogo" },
];

export function PublicHeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-1 rounded-full border border-line/70 bg-[#E9EFF9]/70 p-1"
    >
      {LINKS.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive
                ? "bg-surface text-ink shadow-[0_1px_3px_rgba(16,24,40,0.08)]"
                : "text-muted hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
