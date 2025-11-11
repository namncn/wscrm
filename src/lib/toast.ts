import { toast } from 'sonner'

// Toast utility functions for API responses
export const toastSuccess = (message: string, options?: any) => {
  toast.success(message, options)
}

export const toastError = (message: string, options?: any) => {
  toast.error(message, options)
}

export const toastInfo = (message: string, options?: any) => {
  toast.info(message, options)
}

export const toastWarning = (message: string, options?: any) => {
  toast.warning(message, options)
}

// Toast for API operations
export const toastApiSuccess = (operation: string) => {
  toast.success(`${operation} thành công!`)
}

export const toastApiError = (operation: string, error?: string) => {
  toast.error(`${operation} thất bại! ${error ? error : ''}`)
}

// Toast for form operations
export const toastFormSuccess = (action: string) => {
  toast.success(`${action} thành công!`)
}

export const toastFormError = (action: string, error?: string) => {
  toast.error(`${action} thất bại! ${error ? error : ''}`)
}

// Toast for data operations
export const toastDataSuccess = (action: string, count?: number) => {
  const message = count ? `${action} thành công! (${count} mục)` : `${action} thành công!`
  toast.success(message)
}

export const toastDataError = (action: string, error?: string) => {
  toast.error(`${action} thất bại! ${error ? error : ''}`)
}
