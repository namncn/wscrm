'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface Domain {
  id: number
  domainName: string
  status?: string
}

interface DomainComboboxProps {
  domains: Domain[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function DomainCombobox({
  domains,
  value,
  onValueChange,
  placeholder = 'Chọn domain...',
  className,
}: DomainComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const selectedDomain = domains.find((d) => d.domainName === value)

  const filteredDomains = React.useMemo(() => {
    if (!searchTerm) return domains
    const lowerSearch = searchTerm.toLowerCase()
    return domains.filter((d) =>
      d.domainName.toLowerCase().includes(lowerSearch)
    )
  }, [domains, searchTerm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedDomain ? (
            <span className="truncate">{selectedDomain.domainName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredDomains.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy domain
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <div
                key={domain.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === domain.domainName && 'bg-accent'
                )}
                onClick={() => {
                  onValueChange(domain.domainName)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === domain.domainName ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="font-medium">{domain.domainName}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
