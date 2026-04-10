import { useState, useEffect } from 'react'
import { getMedia } from '../store/mediaDB'

/**
 * item.dataUrl  → 이미지(base64) 또는 편집 중인 영상의 임시 blob URL
 * item.mediaId  → IndexedDB에 저장된 영상의 키
 *
 * 반환값: 실제 렌더링에 쓸 src 문자열 (null이면 아직 로딩 중)
 */
export function useMediaSrc(item) {
  const [src, setSrc] = useState(item?.dataUrl || null)

  useEffect(() => {
    if (!item) return

    // 인라인 dataUrl이 있으면 그대로 사용 (이미지 or 편집 세션의 임시 blob URL)
    if (item.dataUrl) {
      setSrc(item.dataUrl)
      return
    }

    // mediaId만 있으면 IndexedDB에서 Blob 로드
    if (!item.mediaId) {
      setSrc(null)
      return
    }

    let objectUrl = null
    let cancelled = false

    getMedia(item.mediaId).then(blob => {
      if (!cancelled && blob) {
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      }
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [item?.dataUrl, item?.mediaId])

  return src
}
