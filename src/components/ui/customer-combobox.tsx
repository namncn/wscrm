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

interface Customer {
  id: number
  name: string
  email: string
}

interface CustomerComboboxProps {
  customers: Customer[]
  value?: number | string | null
  onValueChange: (value: number | string | null) => void
  placeholder?: string
  className?: string
}

export function CustomerCombobox({
  customers,
  value,
  onValueChange,
  placeholder = 'Chọn khách hàng...',
  className,
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const valueNum = typeof value === 'string' ? parseInt(value) : value
  const selectedCustomer = customers.find((c) => c.id === valueNum)

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return customers
    const lowerSearch = searchTerm.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.email.toLowerCase().includes(lowerSearch)
    )
  }, [customers, searchTerm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedCustomer ? (
            <span className="truncate">
              {selectedCustomer.name} ({selectedCustomer.email})
            </span>
          ) : (
            <span className="text-muted-foreground">Không lựa chọn</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredCustomers.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy khách hàng
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                  valueNum === customer.id && 'bg-accent'
                )}
                onClick={() => {
                  onValueChange(customer.id)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    valueNum === customer.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{customer.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {customer.email}
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

