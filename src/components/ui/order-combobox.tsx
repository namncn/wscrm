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

interface Order {
  id: number
}

interface OrderComboboxProps {
  orders: Order[]
  value?: string | number | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function OrderCombobox({
  orders,
  value,
  onValueChange,
  placeholder = 'Chọn đơn hàng',
  className,
}: OrderComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const valueStr = value?.toString() || null
  const selectedOrder = orders.find(
    (o) => o.id.toString() === valueStr
  )

  const filteredOrders = React.useMemo(() => {
    // Remove duplicates by id to ensure unique keys
    const uniqueOrders = Array.from(
      new Map(orders.map((o) => [o.id, o])).values()
    )
    
    if (!searchTerm) return uniqueOrders
    const lowerSearch = searchTerm.toLowerCase()
    return uniqueOrders.filter(
      (o) =>
        `ORD-${o.id.toString().slice(-8)}`.toLowerCase().includes(lowerSearch) ||
        o.id.toString().includes(searchTerm)
    )
  }, [orders, searchTerm])

  const getOrderDisplay = (orderId: number) => {
    return `ORD-${orderId.toString().slice(-8)}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className || ''}`}
        >
          {selectedOrder ? (
            <span className="truncate">
              {getOrderDisplay(selectedOrder.id)}
            </span>
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
              placeholder="Tìm kiếm đơn hàng..."
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
          {filteredOrders.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              Không tìm thấy đơn hàng
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                onClick={() => {
                  onValueChange(order.id.toString())
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <span>{getOrderDisplay(order.id)}</span>
                {valueStr === order.id.toString() && (
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

