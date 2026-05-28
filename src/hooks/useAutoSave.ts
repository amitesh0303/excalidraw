/**
 * Auto-save hook with change detection
 * Only saves when data actually changes
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutoSaveOptions<T> {
  delay?: number
  onSave: (data: T) => Promise<void>
  onError?: (error: Error) => void
}

/**
 * Auto-save hook that debounces saves and detects changes.
 * Uses refs for latest data/callbacks to avoid stale closures on unmount.
 * Queues pending data when a save is already in progress.
 */
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions<T>
) {
  const { delay = 2000, onSave, onError } = options
  
  const previousDataRef = useRef<string>()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isSavingRef = useRef(false)
  const pendingDataRef = useRef<T | null>(null)
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const savedTimerRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

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
      if (mountedRef.current) setStatus('saving')
      await onSaveRef.current(currentData)
      previousDataRef.current = serialized
      if (mountedRef.current) {
        setStatus('saved')
        // Clear any existing saved timer
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus('idle')
        }, 2000)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
      if (mountedRef.current) setStatus('error')
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
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
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
    status,
    isSaving: isSavingRef.current,
    forceSave: () => save(dataRef.current)
  }
}
