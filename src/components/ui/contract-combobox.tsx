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

interface Contract {
  id: number
  contractNumber: string
}

interface ContractComboboxProps {
  contracts: Contract[]
  value?: number | string | null
  onValueChange: (value: number | string | null) => void
  placeholder?: string
  className?: string
}

export function ContractCombobox({
  contracts,
  value,
  onValueChange,
  placeholder = 'Chọn hợp đồng',
  className,
}: ContractComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const valueNum = typeof value === 'string' ? parseInt(value) : value
  const selectedContract = contracts.find((c) => c.id === valueNum)

  const filteredContracts = React.useMemo(() => {
    if (!searchTerm) return contracts
    const lowerSearch = searchTerm.toLowerCase()
    return contracts.filter((c) =>
      c.contractNumber.toLowerCase().includes(lowerSearch)
    )
  }, [contracts, searchTerm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className || ''}`}
        >
          {selectedContract ? (
            <span className="truncate">{selectedContract.contractNumber}</span>
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
              placeholder="Tìm kiếm hợp đồng..."
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
          {filteredContracts.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500">
              Không tìm thấy hợp đồng
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-sm"
                onClick={() => {
                  onValueChange(contract.id)
                  setOpen(false)
                  setSearchTerm('')
                }}
              >
                <span>{contract.contractNumber}</span>
                {valueNum === contract.id && (
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

