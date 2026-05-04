/**
 * Auto-save hook with change detection
 * Only saves when data actually changes
 */

import { useEffect, useRef, useCallback } from 'react'

export interface UseAutoSaveOptions {
  delay?: number
  onSave: (data: any) => Promise<void>
  onError?: (error: Error) => void
}

/**
 * Auto-save hook that debounces saves and detects changes
 */
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
) {
  const { delay = 2000, onSave, onError } = options
  
  const previousDataRef = useRef<string>()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isSavingRef = useRef(false)

  const save = useCallback(async (currentData: T) => {
    const serialized = JSON.stringify(currentData)
    
    // Skip if data hasn't changed
    if (serialized === previousDataRef.current) {
      return
    }

    // Skip if already saving
    if (isSavingRef.current) {
      return
    }

    try {
      isSavingRef.current = true
      await onSave(currentData)
      previousDataRef.current = serialized
    } catch (error) {
      console.error('Auto-save failed:', error)
      onError?.(error as Error)
    } finally {
      isSavingRef.current = false
    }
  }, [onSave, onError])

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save(data)
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, save])

  // Save immediately on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Force immediate save on unmount
      const serialized = JSON.stringify(data)
      if (serialized !== previousDataRef.current && !isSavingRef.current) {
        onSave(data).catch(error => {
          console.error('Final save failed:', error)
          onError?.(error as Error)
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSaving: isSavingRef.current,
    forceSave: () => save(data)
  }
}
