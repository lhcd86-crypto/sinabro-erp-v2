import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ─────────────────────────────────────────── */

export interface MaterialItem {
  id: string
  project_id: string | null
  name: string
  unit: string | null
  stock_qty: number | null
  min_qty: number | null
  unit_price: number | null
  vendor: string | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

export interface MaterialTransaction {
  id: string
  material_id: string | null
  project_id: string | null
  transaction_type: string | null
  quantity: number | null
  transaction_date: string | null
  vendor: string | null
  unit_price: number | null
  notes: string | null
  created_by: string | null
  created_at: string | null
}

export const MATERIAL_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm2' },
  { value: 'm3', label: 'm3' },
  { value: 'cai', label: 'Cai / 개' },
  { value: 'bo', label: 'Bo / 세트' },
  { value: 'bao', label: 'Bao / 포' },
  { value: 'cuon', label: 'Cuon / 롤' },
  { value: 'thung', label: 'Thung / 박스' },
  { value: 'other', label: 'Khac / 기타' },
]

/* ── Hook ──────────────────────────────────────────── */

export function useMaterial() {
  const [inventory, setInventory] = useState<MaterialItem[]>([])
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  /* ── Load inventory ─── */
  const loadInventory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('material_items')
        .select('*')
        .order('name', { ascending: true })
        .limit(500)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setInventory((data as MaterialItem[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Load transactions ─── */
  const loadTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('material_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(300)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setTransactions((data as MaterialTransaction[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Save transaction (with stock update) ─── */
  const saveTransaction = useCallback(
    async (rec: {
      item_id: string
      transaction_type: 'in' | 'out'
      quantity: number
      transaction_date: string
      vendor?: string
      unit_price?: number
      total_amount?: number
      note?: string
    }) => {
      if (!user || !currentProject)
        throw new Error('No user or project selected')

      const { error: err } = await supabase
        .from('material_transactions')
        .insert({
          material_id: rec.item_id,
          project_id: currentProject,
          transaction_type: rec.transaction_type,
          quantity: rec.quantity,
          transaction_date: rec.transaction_date,
          vendor: rec.vendor || null,
          unit_price: rec.unit_price || null,
          notes: rec.note || null,
          created_by: user.id,
        })

      if (err) throw new Error(err.message)

      // Update stock on the material item
      const item = inventory.find((i) => i.id === rec.item_id)
      if (item) {
        const delta =
          rec.transaction_type === 'in' ? rec.quantity : -rec.quantity
        const newStock = Math.max(0, (item.stock_qty ?? 0) + delta)

        await supabase
          .from('material_items')
          .update({ stock_qty: newStock })
          .eq('id', rec.item_id)
      }

      await loadInventory()
      await loadTransactions()
    },
    [user, currentProject, inventory, loadInventory, loadTransactions],
  )

  /* ── Add new material item ─── */
  const addItem = useCallback(
    async (rec: {
      name: string
      unit: string
      current_stock: number
      min_stock: number
      location?: string
    }) => {
      if (!user) throw new Error('No user')

      const { error: err } = await supabase
        .from('material_items')
        .insert({
          name: rec.name,
          unit: rec.unit,
          stock_qty: rec.current_stock,
          min_qty: rec.min_stock,
          project_id: currentProject,
          created_by: user.id,
        })

      if (err) throw new Error(err.message)
      await loadInventory()
    },
    [user, currentProject, loadInventory],
  )

  return {
    inventory,
    transactions,
    loading,
    error,
    loadInventory,
    loadTransactions,
    saveTransaction,
    addItem,
  }
}
