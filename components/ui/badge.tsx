import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        active: "bg-[#DCFCE7] text-[#15803D]",
        draft: "bg-[#EDE9FE] text-[#5B21B6]",
        hidden: "bg-[#E9EEF6] text-[#475467]",
        options:
          "bg-surface/92 text-ink border border-line/80 backdrop-blur-xs shadow-xs",
        accent: "bg-accent-soft text-accent-ink",
        solid: "bg-accent text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "accent",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
