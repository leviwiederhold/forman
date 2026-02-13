import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input/85 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background/80 focus-visible:ring-ring/45 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-20 w-full rounded-xl border bg-background/60 px-3.5 py-2.5 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md transition-[color,box-shadow,border-color,background-color,transform] duration-200 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-primary/45 hover:bg-background/70 hover:shadow-[0_10px_28px_-24px_rgba(0,74,173,0.8)]",
        "focus-visible:shadow-[0_0_0_1px_rgba(0,74,173,0.45),0_14px_34px_-26px_rgba(0,74,173,0.85)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
