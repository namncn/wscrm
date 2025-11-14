"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Helper function to check if a date is valid
const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime())
}

// Helper function to parse date string to Date in local timezone
const parseDateString = (dateString: string): Date | undefined => {
  if (!dateString || dateString.trim() === '') return undefined
  
  // Extract date part from ISO string (e.g., "2024-01-15T00:00:00.000Z" -> "2024-01-15")
  let datePart = dateString
  if (dateString.includes('T')) {
    datePart = dateString.split('T')[0]
  }
  
  // Check if string matches YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(datePart)) return undefined
  
  const parts = datePart.split('-')
  if (parts.length !== 3) return undefined
  
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  
  // Validate numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined
  
  // Validate reasonable date ranges
  if (year < 1900 || year > 2100) return undefined
  if (month < 1 || month > 12) return undefined
  if (day < 1 || day > 31) return undefined
  
  const date = new Date(year, month - 1, day)
  
  // Verify the date is valid (e.g., not Feb 30)
  if (!isValidDate(date)) return undefined
  
  // Verify the date components match (to catch invalid dates like Feb 30)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  
  return date
}

// Helper function to normalize value to Date object (handles both Date and string)
const normalizeDateValue = (value: Date | string | undefined): Date | undefined => {
  if (!value) return undefined
  
  if (value instanceof Date) {
    // If it's already a Date, validate and normalize
    if (!isValidDate(value)) return undefined
    // Create a new Date using local components to avoid timezone issues
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  
  if (typeof value === 'string') {
    // Parse string as local date
    return parseDateString(value)
  }
  
  return undefined
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled = false,
  className
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Normalize value to Date object
  const normalizedValue = React.useMemo(() => normalizeDateValue(value), [value])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Ensure the date is normalized to local timezone (midnight local time)
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      onChange?.(normalizedDate)
    } else {
      onChange?.(undefined)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !normalizedValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4" />
          {normalizedValue && isValidDate(normalizedValue) ? format(normalizedValue, "dd/MM/yyyy", { locale: vi }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={normalizedValue}
          onSelect={handleSelect}
          defaultMonth={normalizedValue || new Date()}
          initialFocus
          locale={vi}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={2100}
        />
      </PopoverContent>
    </Popover>
  )
}
