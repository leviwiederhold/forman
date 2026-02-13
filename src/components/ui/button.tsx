import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 will-change-transform disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-primary/40 bg-gradient-to-b from-primary via-primary to-primary/90 text-primary-foreground shadow-[0_16px_36px_-20px_color-mix(in_srgb,var(--primary)_80%,transparent)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_20px_44px_-22px_color-mix(in_srgb,var(--primary)_85%,transparent)] active:translate-y-0 active:brightness-105 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.24),transparent_46%)] before:opacity-0 before:transition-opacity hover:before:opacity-100",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70",
        outline:
          "border bg-background/65 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:border-primary/45 hover:bg-accent/65 hover:text-accent-foreground hover:shadow-[0_12px_28px_-20px_rgba(0,74,173,0.7)] active:translate-y-0 dark:bg-input/20 dark:border-input/85 dark:hover:bg-input/40",
        secondary:
          "bg-secondary/85 text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary hover:shadow-[0_10px_24px_-20px_rgba(0,74,173,0.65)] active:translate-y-0",
        ghost:
          "hover:bg-accent/70 hover:text-accent-foreground hover:-translate-y-0.5 active:translate-y-0 dark:hover:bg-accent/55",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3.5 has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
