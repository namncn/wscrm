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

interface HostingPackage {
  id: number
  planName: string
  price: number | string
  storage: number
  bandwidth: number
}

interface HostingPackageComboboxProps {
  packages: HostingPackage[]
  value?: number | string | null
  onValueChange: (value: number | string | null) => void
  placeholder?: string
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function HostingPackageCombobox({
  packages,
  value,
  onValueChange,
  placeholder = 'Chọn gói hosting...',
  className,
  onOpenChange,
}: HostingPackageComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  // Helper function to convert MB to GB
  // If value is 0, it means "Unlimited"
  const mbToGb = (mb: number): string => {
    if (mb === 0 || mb === null || mb === undefined) {
      return 'Unlimited'
    }
    const gb = mb / 1024
    // Round to 1 decimal place, remove trailing zeros
    const rounded = Math.round(gb * 10) / 10
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  // Normalize both value and package id to numbers for comparison
  const valueNum = value === null || value === undefined ? null : (typeof value === 'string' ? parseInt(value, 10) : value)
  const selectedPackage = packages.find((pkg) => {
    const pkgIdNum = typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id
    return pkgIdNum === valueNum
  })

  const filteredPackages = React.useMemo(() => {
    if (!searchTerm) return packages
    const lowerSearch = searchTerm.toLowerCase()
    return packages.filter(
      (pkg) =>
        pkg.planName.toLowerCase().includes(lowerSearch)
    )
  }, [packages, searchTerm])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedPackage ? (
            <span className="truncate">
              {selectedPackage.planName} ({(() => {
                const storage = mbToGb(selectedPackage.storage)
                return storage === 'Unlimited' ? storage : `${storage}GB`
              })()} / {(() => {
                const bandwidth = mbToGb(selectedPackage.bandwidth)
                return bandwidth === 'Unlimited' ? bandwidth : `${bandwidth}GB`
              })()})
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
              placeholder="Tìm kiếm gói hosting..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredPackages.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy gói hosting
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  (() => {
                    const pkgIdNum = typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id
                    return pkgIdNum === valueNum
                  })() && 'bg-accent'
                )}
                onClick={() => {
                  const pkgIdNum = typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id
                  onValueChange(pkgIdNum)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    (() => {
                      const pkgIdNum = typeof pkg.id === 'string' ? parseInt(pkg.id, 10) : pkg.id
                      return pkgIdNum === valueNum
                    })() ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{pkg.planName}</span>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const storage = mbToGb(pkg.storage)
                      return storage === 'Unlimited' ? storage : `${storage}GB`
                    })()} Storage / {(() => {
                      const bandwidth = mbToGb(pkg.bandwidth)
                      return bandwidth === 'Unlimited' ? bandwidth : `${bandwidth}GB`
                    })()} Bandwidth
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

