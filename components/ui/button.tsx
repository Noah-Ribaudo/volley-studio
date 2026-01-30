import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md",
        destructive:
          "bg-destructive text-white border border-destructive hover:bg-destructive/90 active:bg-destructive/80 shadow-sm hover:shadow data-[active=true]:bg-destructive data-[active=true]:text-white data-[active=true]:shadow-md",
        outline:
          "bg-card text-foreground border border-border hover:bg-secondary hover:border-secondary active:bg-secondary/80 data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-primary",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80 active:bg-secondary/70 shadow-sm data-[active=true]:bg-secondary data-[active=true]:shadow-md",
        ghost:
          "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 active:text-primary/70 data-[active=true]:text-primary data-[active=true]:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
