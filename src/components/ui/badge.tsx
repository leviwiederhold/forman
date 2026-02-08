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
      "bg-foreground text-background border-transparent",
    secondary:
      "bg-muted text-foreground border-transparent",
    outline:
      "bg-transparent text-foreground border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}