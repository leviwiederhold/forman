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
      "bg-foreground text-background border-transparent shadow-[0_8px_20px_-16px_rgba(0,0,0,0.9)]",
    secondary:
      "bg-muted text-foreground border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    outline:
      "bg-transparent text-foreground border border-primary/35",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all duration-200 hover:-translate-y-0.5",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
