'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { ArrowDataTransferVerticalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Combobox = ({ open, onOpenChange, children }: ComboboxProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
    </Popover>
  )
}

const ComboboxTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, children, ...props }, ref) => (
  <PopoverTrigger asChild>
    <Button
      ref={ref}
      variant="outline"
      role="combobox"
      className={cn('justify-between', className)}
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ArrowDataTransferVerticalIcon} className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
))
ComboboxTrigger.displayName = 'ComboboxTrigger'

interface ComboboxPopupProps extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  children: React.ReactNode
}

const ComboboxPopup = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  ComboboxPopupProps
>(({ className, children, ...props }, ref) => (
  <PopoverContent ref={ref} className={cn('p-0', className)} {...props}>
    <Command>
      {children}
    </Command>
  </PopoverContent>
))
ComboboxPopup.displayName = 'ComboboxPopup'

interface ComboboxInputProps extends Omit<React.ComponentPropsWithoutRef<typeof CommandInput>, 'value' | 'onValueChange'> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof CommandInput>,
  ComboboxInputProps
>(({ value, onChange, ...props }, ref) => {
  const handleValueChange = React.useCallback((search: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: search }
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }, [onChange])
  
  return (
    <CommandInput
      ref={ref}
      value={value}
      onValueChange={handleValueChange}
      {...props}
    />
  )
})
ComboboxInput.displayName = 'ComboboxInput'

const ComboboxList = React.forwardRef<
  React.ElementRef<typeof CommandList>,
  React.ComponentPropsWithoutRef<typeof CommandList>
>((props, ref) => <CommandList ref={ref} {...props} />)
ComboboxList.displayName = 'ComboboxList'

const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmpty>,
  React.ComponentPropsWithoutRef<typeof CommandEmpty>
>((props, ref) => <CommandEmpty ref={ref} {...props} />)
ComboboxEmpty.displayName = 'ComboboxEmpty'

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof CommandItem>,
  React.ComponentPropsWithoutRef<typeof CommandItem>
>((props, ref) => <CommandItem ref={ref} {...props} />)
ComboboxItem.displayName = 'ComboboxItem'

export {
  Combobox,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxInput,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
}
