"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  onBlur,
  placeholder = "Select...",
  emptyMessage = "No options found.",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (open && !nextOpen) {
      onBlur?.()
    }
    setOpen(nextOpen)
  }

  const focusSearchInput = () => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              setOpen(true)
              focusSearchInput()
            }
          }}
          onBlur={() => {
            if (!open) {
              onBlur?.()
            }
          }}
          className={cn(
            "w-full justify-between bg-white font-normal h-10 px-3 py-2 text-sm border-gray-300 hover:bg-white hover:border-gray-400",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate text-left">
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 bg-white border-gray-200" 
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <Command loop className="bg-white">
          <CommandInput 
            ref={inputRef}
            placeholder="Search..." 
            className="h-9 border-b border-gray-100 bg-white" 
          />
          <CommandList className="max-h-64">
            <CommandEmpty className="text-gray-500 py-2 text-center text-sm">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                    onBlur?.()
                  }}
                  className="py-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
