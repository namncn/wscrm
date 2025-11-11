import { NextResponse } from 'next/server'
import { toastApiSuccess, toastApiError } from '@/lib/toast'

// Utility function to create API responses with toast support
export const createApiResponse = (
  data: any,
  status: number = 200,
  message?: string,
  showToast: boolean = false
) => {
  const response = NextResponse.json(data, { status })
  
  if (showToast && message) {
    if (status >= 200 && status < 300) {
      toastApiSuccess(message)
    } else {
      toastApiError(message)
    }
  }
  
  return response
}

// Success response with toast
export const createSuccessResponse = (data: any, message?: string, showToast: boolean = false) => {
  return createApiResponse({ 
    success: true, 
    data, 
    message 
  }, 200, message, showToast)
}

// Error response with toast
export const createErrorResponse = (error: string, status: number = 500, showToast: boolean = false) => {
  return createApiResponse({ error }, status, error, showToast)
}

// Created response with toast
export const createCreatedResponse = (data: any, message?: string, showToast: boolean = false) => {
  return createApiResponse({ 
    success: true, 
    data, 
    message 
  }, 201, message, showToast)
}
