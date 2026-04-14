import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'

const EDGE_TABLES = [
  'costs',
  'billings',
  'billing_status',
  'salary_monthly',
  'salary_settings',
  'prepayments',
  'subcontract_payments',
  'daily_labor_cost',
] as const

type EdgeTable = (typeof EDGE_TABLES)[number]

function isEdgeTable(table: string): table is EdgeTable {
  return (EDGE_TABLES as readonly string[]).includes(table)
}

interface EdgeApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  table: string
  params?: Record<string, string>
  body?: unknown
}

interface EdgeApiResponse<T = unknown> {
  data: T | null
  error: string | null
}

export async function edgeApi<T = unknown>({
  method = 'GET',
  table,
  params,
  body,
}: EdgeApiOptions): Promise<EdgeApiResponse<T>> {
  const url = new URL(`${SUPABASE_URL}/functions/v1/api`)
  url.searchParams.set('table', table)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { data: null, error: errorText || `HTTP ${response.status}` }
    }

    const data = await response.json()
    return { data: data as T, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Fetch data from either edge function (finance tables) or supabase client directly.
 */
export async function fetchTable<T = unknown>(
  table: string,
  options?: {
    select?: string
    filters?: Record<string, string>
    order?: { column: string; ascending?: boolean }
    limit?: number
  }
): Promise<{ data: T[] | null; error: string | null }> {
  if (isEdgeTable(table)) {
    const params: Record<string, string> = {}
    if (options?.select) params.select = options.select
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        params[key] = value
      }
    }
    if (options?.order) {
      params.order = `${options.order.column}.${options.order.ascending === false ? 'desc' : 'asc'}`
    }
    if (options?.limit) params.limit = String(options.limit)

    return edgeApi<T[]>({ table, params })
  }

  // Non-edge tables: use supabase client directly
  let query = supabase.from(table).select(options?.select ?? '*')

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query = query.eq(key, value)
    }
  }

  if (options?.order) {
    query = query.order(options.order.column, {
      ascending: options.order.ascending ?? true,
    })
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  return {
    data: data as T[] | null,
    error: error ? error.message : null,
  }
}

export async function mutateTable(
  table: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: unknown,
  params?: Record<string, string>
): Promise<{ data: unknown; error: string | null }> {
  if (isEdgeTable(table)) {
    return edgeApi({ method, table, body, params })
  }

  // Non-edge tables: use supabase client directly
  if (method === 'POST') {
    const { data, error } = await supabase.from(table).insert(body as Record<string, unknown>).select()
    return { data, error: error?.message ?? null }
  }

  if (method === 'DELETE') {
    if (!params?.id) return { data: null, error: 'id is required for DELETE' }
    const { data, error } = await supabase.from(table).delete().eq('id', params.id).select()
    return { data, error: error?.message ?? null }
  }

  // PUT / PATCH
  if (!params?.id) return { data: null, error: 'id is required for UPDATE' }
  const { data, error } = await supabase
    .from(table)
    .update(body as Record<string, unknown>)
    .eq('id', params.id)
    .select()
  return { data, error: error?.message ?? null }
}
