import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[14px] border border-line bg-surface px-4 py-2 text-sm text-ink placeholder:text-muted/80 shadow-xs transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  resultLabel?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, resultLabel, placeholder = "Buscar produto...", ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", className)}>
        <Search
          className="pointer-events-none absolute left-4 h-4 w-4 text-muted"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-full border border-line/80 bg-surface pl-10 text-sm text-ink placeholder:text-muted/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
            resultLabel ? "pr-4 sm:pr-24" : "pr-4"
          )}
          {...props}
        />
        {resultLabel ? (
          <span className="pointer-events-none absolute right-2 hidden sm:inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
            {resultLabel}
          </span>
        ) : null}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
