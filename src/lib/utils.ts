import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${timestamp.slice(-6)}-${random}`
}

export function generateContractNumber(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CT-${timestamp.slice(-6)}-${random}`
}

/**
 * Default brand name constant
 * Used across the application as fallback value
 */
export const DEFAULT_BRAND_NAME = 'CRM Portal'

/**
 * Get brand name from environment variable with default value
 * 
 * Uses NEXT_PUBLIC_BRAND_NAME which is accessible on both server and client.
 * This prevents hydration mismatches since both server and client read the same value.
 * 
 * Brand name is not sensitive data, so it's safe to expose in the client bundle.
 * 
 * @returns Brand name string (default: DEFAULT_BRAND_NAME)
 */
export function getBrandName(): string {
  // Use NEXT_PUBLIC_ prefix so it works on both server and client
  // This ensures the same value is used during SSR and client hydration
  return process.env.NEXT_PUBLIC_BRAND_NAME || DEFAULT_BRAND_NAME
}