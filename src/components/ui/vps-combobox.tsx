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

interface VPS {
  id: number
  planName: string
  cpu?: number | null
  ram?: number | null
  storage?: number | null
  bandwidth?: number | null
  price?: string | null
}

interface VPSComboboxProps {
  vpss: VPS[]
  value?: number | null
  onValueChange: (value: number | null) => void
  placeholder?: string
  className?: string
}

export function VPSCombobox({
  vpss,
  value,
  onValueChange,
  placeholder = 'Chọn VPS',
  className,
}: VPSComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const selectedVPS = vpss.find((v) => v.id === value)

  const filteredVPSs = React.useMemo(() => {
    if (!searchTerm) return vpss
    const lowerSearch = searchTerm.toLowerCase()
    return vpss.filter((v) => v.planName.toLowerCase().includes(lowerSearch))
  }, [vpss, searchTerm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className || ''}`}
        >
          {selectedVPS ? (
            <span className="truncate">{selectedVPS.planName}</span>
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
              placeholder="Tìm kiếm VPS..."
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
          {filteredVPSs.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              Không tìm thấy VPS
            </div>
          ) : (
            filteredVPSs.map((vps) => (
              <div
                key={vps.id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                onClick={() => {
                  onValueChange(vps.id)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <div className="flex-1">
                  <div className="font-medium">{vps.planName}</div>
                  <div className="text-xs text-gray-500">
                    ID: {vps.id}
                    {vps.cpu && ` • ${vps.cpu} CPU`}
                    {vps.ram && ` • ${vps.ram}GB RAM`}
                    {vps.storage && ` • ${vps.storage}GB`}
                    {vps.bandwidth && ` • ${vps.bandwidth}GB`}
                    {vps.price &&
                      ` • ${new Intl.NumberFormat('vi-VN').format(
                        parseFloat(vps.price || '0')
                      )} VNĐ`}
                  </div>
                </div>
                {value === vps.id && (
                  <Check className="h-4 w-4 text-blue-600 ml-2" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

