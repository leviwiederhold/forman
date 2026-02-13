import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input/85 h-10 w-full min-w-0 rounded-xl border bg-background/60 px-3.5 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md transition-[color,box-shadow,border-color,background-color,transform] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-primary/45 hover:bg-background/70 hover:shadow-[0_10px_28px_-24px_rgba(0,74,173,0.8)]",
        "focus-visible:border-ring focus-visible:bg-background/80 focus-visible:shadow-[0_0_0_1px_rgba(0,74,173,0.45),0_14px_34px_-26px_rgba(0,74,173,0.85)] focus-visible:ring-ring/45 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
