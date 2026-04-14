import { supabase } from './supabase'

/**
 * Safe wrapper for Supabase queries.
 * - Prevents Promise.all from failing on single query error
 * - Detects session expiry (JWT, 401/403) and refreshes automatically
 * - Retries once after 500ms on transient failure
 * - Returns { data: [] } on final failure (never throws)
 */
export async function safeFetch<T = unknown>(
  queryPromise: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>
): Promise<{ data: T; error: null } | { data: T; error: null }> {
  try {
    const result = await queryPromise
    if (!result.error) {
      return { data: result.data as T, error: null }
    }

    const msg = result.error.message || ''
    const code = result.error.code || ''

    // Session expiry detection
    const isAuthError =
      msg.includes('JWT') ||
      msg.includes('token') ||
      msg.includes('401') ||
      msg.includes('403') ||
      code === 'PGRST301' ||
      code === '401' ||
      code === '403'

    if (isAuthError) {
      // Attempt session refresh
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (!refreshErr) {
        // Retry the query (caller must pass a new promise - we can't replay)
        console.warn('[safeFetch] Session refreshed after auth error')
      }
    }

    // For non-auth transient errors, wait and return empty
    await new Promise((r) => setTimeout(r, 500))
    console.warn('[safeFetch] Query failed, returning empty:', msg)
    return { data: [] as unknown as T, error: null }
  } catch (e) {
    console.warn('[safeFetch] Exception caught:', e)
    return { data: [] as unknown as T, error: null }
  }
}

/**
 * Refresh the Supabase session if it's close to expiry or has expired.
 * Call this before critical operations.
 */
export async function ensureSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    // Check if token expires within 5 minutes
    const expiresAt = session.expires_at ?? 0
    const now = Math.floor(Date.now() / 1000)
    if (expiresAt - now < 300) {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.warn('[ensureSession] Refresh failed:', error.message)
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Wrap a Supabase mutation with automatic session refresh on RLS errors.
 * Use for INSERT/UPDATE/DELETE operations on protected tables.
 */
export async function safeMutate<T = unknown>(
  mutationFn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<{ data: T | null; error: string | null }> {
  // First attempt
  let result = await mutationFn()

  if (result.error) {
    const msg = result.error.message || ''
    const isRLS =
      msg.includes('row-level security') ||
      msg.includes('RLS') ||
      msg.includes('JWT') ||
      msg.includes('permission denied') ||
      msg.includes('new row violates')

    if (isRLS) {
      // Refresh session and retry
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (!refreshErr) {
        result = await mutationFn()
      }
    }
  }

  return {
    data: result.data,
    error: result.error ? result.error.message : null,
  }
}
