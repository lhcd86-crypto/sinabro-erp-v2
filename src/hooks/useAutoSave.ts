'use client'

import { useEffect, useCallback, useRef } from 'react'

/**
 * Auto-save form data to localStorage.
 * Usage:
 *   const { save, load, clear } = useAutoSave('report-form')
 *   // On mount: const saved = load(); if (saved) setFormData(saved)
 *   // On change: save(formData)
 *   // On submit: clear()
 */
export function useAutoSave<T = Record<string, unknown>>(key: string, debounceMs = 2000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        try {
          const payload = {
            data,
            savedAt: new Date().toISOString(),
          }
          localStorage.setItem(`autosave:${key}`, JSON.stringify(payload))
        } catch {
          // Storage full or unavailable
        }
      }, debounceMs)
    },
    [key, debounceMs]
  )

  const load = useCallback((): { data: T; savedAt: string } | null => {
    try {
      const raw = localStorage.getItem(`autosave:${key}`)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      // Discard saves older than 24 hours
      const age = Date.now() - new Date(parsed.savedAt).getTime()
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`autosave:${key}`)
        return null
      }
      return parsed
    } catch {
      return null
    }
  }, [key])

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    localStorage.removeItem(`autosave:${key}`)
  }, [key])

  const hasSaved = useCallback((): boolean => {
    return localStorage.getItem(`autosave:${key}`) !== null
  }, [key])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { save, load, clear, hasSaved }
}
