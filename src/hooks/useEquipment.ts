import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ─────────────────────────────────────────── */

export interface EquipmentRecord {
  id: string
  project_id: string | null
  name: string
  code: string
  product_code: string | null
  category: string
  status: string
  note: string | null
  photo_url: string | null
  current_project_id: string | null
  created_at: string
  projects?: { code: string; name: string } | null
}

export interface RepairRecord {
  id: string
  equipment_id: string
  repair_date: string
  description: string
  cost: number | null
  performed_by: string | null
  status: string
  created_at: string
}

export interface TransferRecord {
  id: string
  equipment_id: string
  from_project_id: string | null
  to_project_id: string
  transfer_date: string
  transferred_by: string
  note: string | null
  created_at: string
}

export type EquipmentStatus = 'active' | 'repair' | 'idle'

export const EQUIPMENT_STATUSES: { value: EquipmentStatus; label: string }[] = [
  { value: 'active', label: 'Hoat dong / 가동중' },
  { value: 'repair', label: 'Sua chua / 수리중' },
  { value: 'idle', label: 'Nghi / 대기' },
]

export const EQUIPMENT_CATEGORIES = [
  { value: 'heavy', label: 'May nang / 중장비' },
  { value: 'vehicle', label: 'Xe / 차량' },
  { value: 'tool', label: 'Dung cu / 공구' },
  { value: 'scaffold', label: 'Gian giao / 비계' },
  { value: 'electric', label: 'Dien / 전기장비' },
  { value: 'other', label: 'Khac / 기타' },
]

/* ── Hook ──────────────────────────────────────────── */

export function useEquipment() {
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([])
  const [repairs, setRepairs] = useState<RepairRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const currentProject = useAuthStore((s) => s.currentProject)

  /* ── Load equipment ─── */
  const loadEquipment = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('equipment_items')
        .select('*')
        .order('name', { ascending: true })
        .limit(500)

      if (currentProject) query = query.eq('project_id', currentProject)

      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setEquipment((data as EquipmentRecord[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  /* ── Add equipment ─── */
  const addEquipment = useCallback(
    async (rec: {
      name: string
      code: string
      category: string
      status: string
      note?: string
    }) => {
      if (!user) throw new Error('No user')

      const insertData: Record<string, unknown> = {
        name: rec.name,
        product_code: rec.code || null,
        category: rec.category,
        status: rec.status,
        project_id: currentProject,
        note: rec.note || null,
        registered_by: user.id,
        registered_by_name: user.name || null,
      }

      let { error: err } = await supabase.from('equipment_items').insert(insertData)

      // Fallback: remove optional columns
      if (err?.message?.includes('column')) {
        delete insertData.registered_by
        delete insertData.registered_by_name
        delete insertData.product_code
        ;({ error: err } = await supabase.from('equipment_items').insert(insertData))
      }

      if (err) throw new Error(err.message)
      await loadEquipment()
    },
    [user, currentProject, loadEquipment],
  )

  /* ── Update equipment ─── */
  const updateEquipment = useCallback(
    async (id: string, updates: Partial<EquipmentRecord>) => {
      if (!user) throw new Error('No user')

      const { error: err } = await supabase
        .from('equipment_items')
        .update(updates)
        .eq('id', id)

      if (err) throw new Error(err.message)
      await loadEquipment()
    },
    [user, loadEquipment],
  )

  /* ── Transfer equipment ─── */
  const transferEquipment = useCallback(
    async (equipmentId: string, toProjectId: string, note?: string) => {
      if (!user) throw new Error('No user')

      // Find the current equipment to get from_project_id
      const item = equipment.find((e) => e.id === equipmentId)

      // Insert transfer record
      const transferData: Record<string, unknown> = {
        equipment_id: equipmentId,
        from_project_id: item?.project_id || currentProject,
        to_project_id: toProjectId,
        transfer_date: new Date().toISOString().slice(0, 10),
        transferred_by: user.id,
        note: note || null,
      }

      const { error: tErr } = await supabase
        .from('equipment_transfers')
        .insert(transferData)

      if (tErr) console.warn('Transfer log skipped:', tErr.message)

      // Update equipment project_id
      const { error: err } = await supabase
        .from('equipment_items')
        .update({ project_id: toProjectId })
        .eq('id', equipmentId)

      if (err) throw new Error(err.message)
      await loadEquipment()
    },
    [user, currentProject, equipment, loadEquipment],
  )

  /* ── Load repairs ─── */
  const loadRepairs = useCallback(
    async (equipmentId: string) => {
      if (!user) return
      try {
        const { data, error: err } = await supabase
          .from('equipment_repairs')
          .select('*')
          .eq('equipment_id', equipmentId)
          .order('repair_date', { ascending: false })
          .limit(100)

        if (err) throw new Error(err.message)
        setRepairs((data as RepairRecord[]) ?? [])
      } catch (e) {
        console.warn('Failed to load repairs:', e)
        setRepairs([])
      }
    },
    [user],
  )

  /* ── Add repair ─── */
  const addRepair = useCallback(
    async (rec: {
      equipment_id: string
      repair_date: string
      description: string
      cost: number | null
      performed_by: string | null
      status: string
    }) => {
      if (!user) throw new Error('No user')

      const { error: err } = await supabase
        .from('equipment_repairs')
        .insert(rec)

      if (err) throw new Error(err.message)

      // Set equipment status to repair
      await supabase
        .from('equipment_items')
        .update({ status: 'repair' })
        .eq('id', rec.equipment_id)

      await loadRepairs(rec.equipment_id)
      await loadEquipment()
    },
    [user, loadRepairs, loadEquipment],
  )

  return {
    equipment,
    repairs,
    loading,
    error,
    loadEquipment,
    addEquipment,
    updateEquipment,
    transferEquipment,
    loadRepairs,
    addRepair,
  }
}
