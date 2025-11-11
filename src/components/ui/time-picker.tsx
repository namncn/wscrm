'use client'

import * as React from 'react'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TimePickerProps {
  value?: string
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  minuteStep?: number
  placeholder?: string
  className?: string
  clearable?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, index) => index)

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function parseTime(value?: string) {
  if (!value) {
    return { hour: null, minute: null }
  }

  const [hourPart, minutePart] = value.split(':')
  const hour = Number.parseInt(hourPart ?? '', 10)
  const minute = Number.parseInt(minutePart ?? '', 10)

  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    return { hour: null, minute: null }
  }
  if (Number.isNaN(minute) || minute < 0 || minute > 59) {
    return { hour, minute: null }
  }

  return { hour, minute }
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  minuteStep = 5,
  placeholder = 'Chọn giờ',
  className,
  clearable = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const parsedValue = React.useMemo(() => parseTime(value), [value])
  const [tempHour, setTempHour] = React.useState<number | null>(parsedValue.hour)
  const [tempMinute, setTempMinute] = React.useState<number | null>(parsedValue.minute)

  const minutes = React.useMemo(() => {
    const step = Number.isFinite(minuteStep) && minuteStep > 0 && minuteStep <= 60 ? minuteStep : 5
    const items: number[] = []
    for (let minute = 0; minute < 60; minute += step) {
      items.push(minute)
    }
    if (!items.includes(0)) {
      items.unshift(0)
    }
    if (!items.includes(59) && step === 1) {
      items.push(59)
    }
    return items
  }, [minuteStep])

  React.useEffect(() => {
    if (open) {
      setTempHour(parsedValue.hour)
      setTempMinute(parsedValue.minute)
    }
  }, [open, parsedValue.hour, parsedValue.minute])

  const handleHourSelect = (hour: number) => {
    setTempHour(hour)
  }

  const handleMinuteSelect = (minute: number) => {
    setTempMinute(minute)
  }

  const handleClear = () => {
    setTempHour(null)
    setTempMinute(null)
    onChange?.(undefined)
    setOpen(false)
  }

  const displayValue =
    value && parsedValue.hour !== null && parsedValue.minute !== null
      ? `${pad(parsedValue.hour)}:${pad(parsedValue.minute)}`
      : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-between text-left font-normal',
            (!value || parsedValue.hour === null || parsedValue.minute === null) && 'text-muted-foreground',
            className
          )}
        >
          <span>{displayValue}</span>
          <Clock className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="flex divide-x">
          <div className="max-h-60 w-1/2 overflow-y-auto">
            {HOURS.map((hour) => {
              const isSelected = tempHour === hour
              return (
                <button
                  key={hour}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => handleHourSelect(hour)}
                >
                  <span>{pad(hour)}</span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
          <div className="max-h-60 w-1/2 overflow-y-auto">
            {minutes.map((minute) => {
              const isSelected = tempMinute === minute
              return (
                <button
                  key={minute}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => handleMinuteSelect(minute)}
                >
                  <span>{pad(minute)}</span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {tempHour !== null && tempMinute !== null ? `${pad(tempHour)}:${pad(tempMinute)}` : 'Chưa chọn'}
          </span>
          <div className="flex gap-2">
            {clearable && (
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                Xoá
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (tempHour === null || tempMinute === null) {
                  return
                }
                const formatted = `${pad(tempHour)}:${pad(tempMinute)}`
                onChange?.(formatted)
                setOpen(false)
              }}
              disabled={tempHour === null || tempMinute === null}
            >
              Chọn
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}


