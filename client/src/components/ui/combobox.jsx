import * as React from 'react'
import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const defaultFrameworks = [
  { value: 'next.js', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt.js', label: 'Nuxt.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' }
]

export function Combobox({
  options = defaultFrameworks,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.',
  className,
  buttonClassName,
  popoverContentClassName,
  disabled = false,
  renderItem,
  renderTrigger
}) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState('')

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleSelect = (selectedVal) => {
    const nextVal = selectedVal === currentValue ? '' : selectedVal
    if (!isControlled) {
      setInternalValue(nextVal)
    }
    if (onChange) {
      onChange(nextVal)
    }
    setOpen(false)
  }

  const selectedOption = options.find((opt) => opt.value === currentValue)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-start transition-all shadow-sm',
            'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
            'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/80',
            'focus-visible:ring-2 focus-visible:ring-orange-500/50',
            buttonClassName,
            className
          )}
        >
          {renderTrigger ? (
            renderTrigger(selectedOption, placeholder)
          ) : (
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'p-0 shadow-xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 z-[1200]',
          popoverContentClassName
        )}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-slate-500 dark:text-zinc-400">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = opt.value === currentValue
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value + ' ' + (opt.label || '') + ' ' + (opt.keywords || '')}
                    onSelect={() => handleSelect(opt.value)}
                    className={cn(
                      'cursor-pointer py-2 px-3 text-sm flex items-center justify-between rounded-md transition-colors',
                      'hover:bg-slate-100 dark:hover:bg-zinc-700',
                      isSelected && 'bg-orange-50 text-orange-600 font-medium dark:bg-orange-950/40 dark:text-orange-400'
                    )}
                  >
                    {renderItem ? (
                      renderItem(opt, isSelected)
                    ) : (
                      <span className="flex-1 truncate">{opt.label}</span>
                    )}
                    <Check
                      className={cn(
                        'ms-2 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400 transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function ComboboxDemo() {
  const [value, setValue] = useState('')
  return <Combobox value={value} onChange={setValue} />
}
