'use client'

import { useState, useCallback } from 'react'

interface GPSPosition {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

interface GPSResult {
  position: GPSPosition | null
  error: string | null
  loading: boolean
}

/**
 * Calculate distance between two GPS coordinates in meters (Haversine formula).
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Hook to get current GPS position and validate against a target location.
 *
 * Usage:
 *   const { getPosition, validatePosition } = useGPS()
 *
 *   // Get current position
 *   const pos = await getPosition()
 *
 *   // Check if within radius of site
 *   const { isWithin, distance } = validatePosition(pos, siteLat, siteLng, 500)
 */
export function useGPS() {
  const [result, setResult] = useState<GPSResult>({
    position: null,
    error: null,
    loading: false,
  })

  const getPosition = useCallback((): Promise<GPSPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setResult({ position: null, error: 'GPS không khả dụng / GPS 미지원', loading: false })
        resolve(null)
        return
      }

      setResult((prev) => ({ ...prev, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GPSPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          }
          setResult({ position, error: null, loading: false })
          resolve(position)
        },
        (err) => {
          let errorMsg = 'Lỗi GPS / GPS 오류'
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Quyền GPS bị từ chối / GPS 권한 거부됨'
              break
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Không tìm được vị trí / 위치 확인 불가'
              break
            case err.TIMEOUT:
              errorMsg = 'GPS hết thời gian / GPS 시간 초과'
              break
          }
          setResult({ position: null, error: errorMsg, loading: false })
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )
    })
  }, [])

  const validatePosition = useCallback(
    (
      current: GPSPosition | null,
      targetLat: number,
      targetLng: number,
      radiusMeters: number
    ): { isWithin: boolean; distance: number } => {
      if (!current) return { isWithin: false, distance: -1 }
      const dist = distanceMeters(current.lat, current.lng, targetLat, targetLng)
      return { isWithin: dist <= radiusMeters, distance: Math.round(dist) }
    },
    []
  )

  return {
    ...result,
    getPosition,
    validatePosition,
  }
}
