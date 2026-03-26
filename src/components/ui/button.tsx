import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-2 text-sm font-bold uppercase tracking-[0.12em] transition-[background-color,border-color,color] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:border-[#410003] hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]",
        destructive:
          "border-destructive bg-destructive text-white hover:border-[#93000a] hover:bg-[#93000a]",
        outline:
          "border-border bg-background text-foreground hover:border-primary hover:bg-muted",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:bg-[#474746]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-[#dfbfbc] hover:bg-muted",
        link: "border-transparent p-0 h-auto text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5 text-[11px]",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10 px-0",
        "icon-sm": "size-8 px-0",
        "icon-lg": "size-11 px-0",
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
