import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ── Types ── */
export interface WorkerCounts {
  wd_am: number
  wd_pm: number
  wd_ni: number
  wi_am: number
  wi_pm: number
  wi_ni: number
  vn_am: number
  vn_pm: number
  vn_ni: number
  ot_direct: number
  ot_indirect: number
}

export interface MaterialQty {
  v250: number
  sv250: number
  hlm: number
  m230: number
  db2015: number
  etc: number
}

export interface ExtraMaterial {
  name: string
  qty: number
  unit: string
}

export interface ReportFormData {
  project_id: string
  date: string
  work_type: string // 주간 | 야간 | 주+야
  weather: string
  workers: WorkerCounts
  materials: MaterialQty
  extra_materials: ExtraMaterial[]
  description: string
  photos: File[]
}

export interface DailyReportRow {
  id: string
  project_id: string
  date: string
  work_type: string
  weather: string
  workers: WorkerCounts
  materials: MaterialQty
  extra_materials: ExtraMaterial[]
  description: string
  photo_urls: string[]
  created_by: string
  created_at: string
  confirmed: boolean
  confirmed_at: string | null
  confirmed_by: string | null
  revision_requested: boolean
  projects?: { code: string; name: string }
  users?: { name: string }
}

/* ── Hook ── */
export function useDailyReport() {
  const [reports, setReports] = useState<DailyReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)

  /* Load reports */
  const loadReports = useCallback(
    async (projectId?: string) => {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('daily_reports')
          .select(
            '*, projects(code, name), users:created_by(name)'
          )
          .order('date', { ascending: false })
          .limit(100)

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        const { data, error: err } = await query

        if (err) throw err
        setReports((data as DailyReportRow[]) ?? [])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load reports'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /* Load only my reports */
  const loadMyReports = useCallback(
    async (projectId?: string) => {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('daily_reports')
          .select(
            '*, projects(code, name)'
          )
          .eq('created_by', user.id)
          .order('date', { ascending: false })
          .limit(50)

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        const { data, error: err } = await query
        if (err) throw err
        setReports((data as DailyReportRow[]) ?? [])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load reports'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /* Upload photos to supabase storage, return URLs */
  const uploadPhotos = async (
    files: File[],
    projectId: string,
    date: string
  ): Promise<string[]> => {
    const urls: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `daily-reports/${projectId}/${date}/${crypto.randomUUID()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('report-photos')
        .upload(path, file, { upsert: false })

      if (uploadErr) throw uploadErr

      const {
        data: { publicUrl },
      } = supabase.storage.from('report-photos').getPublicUrl(path)

      urls.push(publicUrl)
    }

    return urls
  }

  /* Submit a new report */
  const submitReport = useCallback(
    async (data: ReportFormData) => {
      if (!user) throw new Error('Not authenticated')
      setLoading(true)
      setError(null)

      try {
        // ── 인원수 검증: workforce_photos 대비 20% 이상 차이 경고 ──
        const totalWorkers = Object.values(data.workers as unknown as Record<string, number>).reduce(
          (sum, n) => sum + (typeof n === 'number' ? n : 0),
          0
        )
        if (totalWorkers > 0) {
          try {
            const { data: rcData } = await supabase
              .from('workforce_photos')
              .select('worker_ids')
              .eq('project_id', data.project_id)
              .eq('photo_date', data.date)
              .limit(10)
            const photoHeadcount = (rcData ?? []).reduce((sum, rc) => {
              const ids = rc.worker_ids as string[] | null
              return sum + (ids?.length ?? 0)
            }, 0)
            if (photoHeadcount > 0) {
              const diff = Math.abs(totalWorkers - photoHeadcount) / photoHeadcount
              if (diff > 0.2) {
                const msg = `일보 인원(${totalWorkers})과 출석체크 인원(${photoHeadcount})이 ` +
                  `${Math.round(diff * 100)}% 차이납니다. 확인해주세요. / ` +
                  `Số người trong báo cáo (${totalWorkers}) chênh lệch ${Math.round(diff * 100)}% so với điểm danh (${photoHeadcount}).`
                console.warn('[headcount]', msg)
                // Return warning message to caller for UI display
                ;(data as unknown as Record<string, unknown>)._headcountWarning = msg
              }
            }
          } catch {
            // headcount validation failure is non-blocking
          }
        }

        // Upload photos first
        let photoUrls: string[] = []
        if (data.photos.length > 0) {
          photoUrls = await uploadPhotos(
            data.photos,
            data.project_id,
            data.date
          )
        }

        const row = {
          project_id: data.project_id,
          date: data.date,
          work_type: data.work_type,
          weather: data.weather,
          workers: data.workers,
          materials: data.materials,
          extra_materials: data.extra_materials,
          description: data.description,
          photo_urls: photoUrls,
          created_by: user.id,
          confirmed: false,
          revision_requested: false,
        }

        const { error: err } = await supabase
          .from('daily_reports')
          .insert(row)

        if (err) throw err
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to submit report'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /* Confirm a report (QS) */
  const confirmReport = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated')
      setLoading(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('daily_reports')
          .update({
            confirmed: true,
            confirmed_at: new Date().toISOString(),
            confirmed_by: user.id,
            revision_requested: false,
          })
          .eq('id', id)

        if (err) throw err

        // Update local state
        setReports((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  confirmed: true,
                  confirmed_at: new Date().toISOString(),
                  confirmed_by: user.id,
                  revision_requested: false,
                }
              : r
          )
        )
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'Failed to confirm report'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /* Request revision */
  const requestRevision = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('daily_reports')
          .update({ revision_requested: true })
          .eq('id', id)

        if (err) throw err

        setReports((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, revision_requested: true } : r
          )
        )
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'Failed to request revision'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    reports,
    loading,
    error,
    loadReports,
    loadMyReports,
    submitReport,
    confirmReport,
    requestRevision,
  }
}
