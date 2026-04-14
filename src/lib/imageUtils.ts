/**
 * Image processing utilities for construction site photos.
 * - Resize to max width for bandwidth optimization
 * - Add watermark with project code + timestamp for audit trail
 */

interface ResizeOptions {
  maxWidth?: number
  quality?: number
  watermarkText?: string
}

/**
 * Resize image and optionally add watermark.
 * Returns a new File object ready for upload.
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const { maxWidth = 1200, quality = 0.82, watermarkText } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.onload = () => {
        // Calculate new dimensions
        let w = img.width
        let h = img.height

        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }

        // Draw on canvas
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file) // fallback to original
          return
        }

        ctx.drawImage(img, 0, 0, w, h)

        // Add watermark if text provided
        if (watermarkText) {
          const fontSize = Math.max(12, Math.round(w * 0.018))
          ctx.font = `bold ${fontSize}px sans-serif`

          // Background strip at bottom
          const textMetrics = ctx.measureText(watermarkText)
          const padding = 6
          const stripHeight = fontSize + padding * 2
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
          ctx.fillRect(0, h - stripHeight, w, stripHeight)

          // Text
          ctx.fillStyle = '#ffffff'
          ctx.textBaseline = 'bottom'
          ctx.fillText(watermarkText, padding, h - padding)

          // Right-aligned timestamp
          const now = new Date()
          const ts = now.toLocaleString('ko-KR', { timeZone: 'Asia/Ho_Chi_Minh' })
          const tsWidth = ctx.measureText(ts).width
          ctx.fillText(ts, w - tsWidth - padding, h - padding)

          // Semi-transparent watermark in center
          ctx.globalAlpha = 0.15
          const bigSize = Math.max(24, Math.round(w * 0.05))
          ctx.font = `bold ${bigSize}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#ffffff'
          ctx.fillText(watermarkText, w / 2, h / 2)
          ctx.globalAlpha = 1.0
        }

        // Convert to Blob → File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const newFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            )
            resolve(newFile)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => resolve(file) // fallback
      img.src = reader.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Process multiple files: resize + watermark.
 * Returns array of processed File objects.
 * Includes progress callback.
 */
export async function processPhotos(
  files: File[],
  projectCode: string,
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const watermarkText = projectCode || 'SINABRO'
  const results: File[] = []

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length)
    const processed = await resizeImage(files[i], { watermarkText })
    results.push(processed)
  }

  return results
}

/**
 * Upload files with progress tracking and timeout.
 */
export async function uploadFilesWithProgress(
  bucket: string,
  files: File[],
  pathPrefix: string,
  supabase: { storage: { from: (b: string) => { upload: (p: string, f: File, o?: object) => Promise<{ error: unknown }>, getPublicUrl: (p: string) => { data: { publicUrl: string } } } } },
  options?: {
    timeoutMs?: number
    onProgress?: (current: number, total: number) => void
  }
): Promise<string[]> {
  const { timeoutMs = 30000, onProgress } = options ?? {}
  const urls: string[] = []

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length)
    const path = `${pathPrefix}/${Date.now()}_${files[i].name}`

    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(path, files[i], { upsert: true })

    const timeoutPromise = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: 'Upload timeout' }), timeoutMs)
    )

    const result = await Promise.race([uploadPromise, timeoutPromise])

    if (!result.error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      if (data?.publicUrl) urls.push(data.publicUrl)
    }
  }

  return urls
}
