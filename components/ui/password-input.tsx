'use client'

import * as React from "react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Button } from "./button"

export interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  showToggle?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Expose the input element through the forwarded ref
    React.useImperativeHandle(ref, () => inputRef.current!, [])

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev)
      // Keep focus on input after toggling
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }

    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type={showPassword ? "text" : "password"}
          className={cn(showToggle && "pr-10", className)}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4 text-muted-foreground" />
            ) : (
              <HugeiconsIcon icon={ViewIcon} className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }

