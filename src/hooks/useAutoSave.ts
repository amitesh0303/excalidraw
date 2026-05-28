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
 * Auto-save hook that debounces saves and detects changes.
 * Uses refs for latest data/callbacks to avoid stale closures on unmount.
 * Queues pending data when a save is already in progress.
 */
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
) {
  const { delay = 2000, onSave, onError } = options
  
  const previousDataRef = useRef<string>()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isSavingRef = useRef(false)
  const pendingDataRef = useRef<T | null>(null)

  // Keep refs to latest values so unmount cleanup never has stale data
  const dataRef = useRef<T>(data)
  dataRef.current = data

  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const save = useCallback(async (currentData: T) => {
    const serialized = JSON.stringify(currentData)
    
    // Skip if data hasn't changed
    if (serialized === previousDataRef.current) {
      return
    }

    // If already saving, queue the latest data for retry after current save completes
    if (isSavingRef.current) {
      pendingDataRef.current = currentData
      return
    }

    try {
      isSavingRef.current = true
      await onSaveRef.current(currentData)
      previousDataRef.current = serialized
    } catch (error) {
      console.error('Auto-save failed:', error)
      onErrorRef.current?.(error as Error)
    } finally {
      isSavingRef.current = false

      // If there is pending data queued during the save, retry now
      const pending = pendingDataRef.current
      if (pending !== null) {
        pendingDataRef.current = null
        // Use setTimeout(0) to avoid deep recursion
        setTimeout(() => save(pending), 0)
      }
    }
  }, [])

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

  // Save immediately on unmount using refs for current values
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Force immediate save on unmount using the latest data from ref
      const currentData = dataRef.current
      const serialized = JSON.stringify(currentData)
      if (serialized !== previousDataRef.current && !isSavingRef.current) {
        onSaveRef.current(currentData).catch(error => {
          console.error('Final save failed:', error)
          onErrorRef.current?.(error as Error)
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSaving: isSavingRef.current,
    forceSave: () => save(dataRef.current)
  }
}
