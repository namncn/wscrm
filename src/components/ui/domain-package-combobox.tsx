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

interface DomainPackage {
  id: string
  name: string
  price: number
  description: string
}

interface DomainPackageComboboxProps {
  packages: DomainPackage[]
  value?: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function DomainPackageCombobox({
  packages,
  value,
  onValueChange,
  placeholder = 'Chọn gói tên miền...',
  className,
}: DomainPackageComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const selectedPackage = packages.find((pkg) => pkg.id === value)

  const filteredPackages = React.useMemo(() => {
    if (!searchTerm) return packages
    const lowerSearch = searchTerm.toLowerCase()
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(lowerSearch) ||
        pkg.description.toLowerCase().includes(lowerSearch)
    )
  }, [packages, searchTerm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedPackage ? (
            <span className="truncate">
              {selectedPackage.name}
            </span>
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
              placeholder="Tìm kiếm gói tên miền..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredPackages.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy gói tên miền
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  value === pkg.id && 'bg-accent'
                )}
                onClick={() => {
                  onValueChange(pkg.id)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === pkg.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{pkg.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {pkg.description}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

