"use client"

import { useState } from "react"
import { ChevronsUpDownIcon } from "lucide-react"

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

export function MaterialCombobox({
  materials,
  value,
  onChange,
}: {
  materials: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-12 w-full justify-between rounded-xl px-4 text-base font-normal"
          />
        }
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value || "Buscar material..."}
        </span>
        <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Buscar material..." />
          <CommandList>
            <CommandEmpty>No se encontró el material.</CommandEmpty>
            <CommandGroup>
              {materials.map((material) => (
                <CommandItem
                  key={material}
                  value={material}
                  data-checked={value === material}
                  onSelect={(current) => {
                    onChange(current === value ? "" : current)
                    setOpen(false)
                  }}
                >
                  {material}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
