'use client'

import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
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
}

interface DomainComboboxProps {
  domains: Domain[]
  value?: number | null
  onValueChange: (value: number | null) => void
  placeholder?: string
  className?: string
}

export function DomainCombobox({
  domains,
  value,
  onValueChange,
  placeholder = 'Chọn tên miền',
  className,
}: DomainComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const selectedDomain = domains.find((d) => d.id === value)

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
          className={`w-full justify-between ${className || ''}`}
        >
          {selectedDomain ? (
            <span className="truncate">{selectedDomain.domainName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden"
        align="start"
      >
        <div className="p-3 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm tên miền..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="pl-8"
            />
          </div>
        </div>
        <div
          className="max-h-[300px] overflow-y-auto overflow-x-hidden"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
            onClick={() => {
              onValueChange(null)
              setOpen(false)
              setSearchTerm('')
            }}
          >
            <span className="text-gray-500">Không chọn</span>
            {!value && <Check className="h-4 w-4 text-blue-600" />}
          </div>
          {filteredDomains.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              Không tìm thấy tên miền
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <div
                key={domain.id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                onClick={() => {
                  onValueChange(domain.id)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <span>{domain.domainName}</span>
                {value === domain.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

