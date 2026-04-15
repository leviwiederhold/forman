import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default:
      "bg-foreground text-background border-foreground",
    secondary:
      "bg-muted text-foreground border-border",
    outline:
      "bg-transparent text-foreground border-border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] border",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
