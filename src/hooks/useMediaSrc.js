import { useState, useEffect, useRef } from 'react'
import { getMedia } from '../store/mediaDB'

/**
 * item.dataUrl  → 이미지(base64) 또는 편집 중인 영상의 임시 blob URL
 * item.mediaId  → IndexedDB에 저장된 영상의 키
 *
 * 반환값: 실제 렌더링에 쓸 src 문자열 (null이면 아직 로딩 중)
 */
export function useMediaSrc(item) {
  const [src, setSrc] = useState(item?.dataUrl || null)
  // 현재 살아있는 objectUrl을 추적 → 새 URL 로드 완료 후에만 revoke
  const activeUrlRef = useRef(null)

  useEffect(() => {
    if (!item) {
      setSrc(null)
      return
    }

    // 인라인 dataUrl이 있으면 그대로 사용 (이미지 or 편집 세션의 임시 blob URL)
    if (item.dataUrl) {
      // 이전 objectUrl이 있으면 해제
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
      setSrc(item.dataUrl)
      return
    }

    // mediaId만 있으면 IndexedDB에서 Blob 로드
    if (!item.mediaId) {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
      setSrc(null)
      return
    }

    let cancelled = false

    getMedia(item.mediaId).then(blob => {
      if (cancelled || !blob) return
      const newUrl = URL.createObjectURL(blob)
      // 새 URL 준비됐을 때만 이전 URL 해제 (중간에 깨진 상태 방지)
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current)
      activeUrlRef.current = newUrl
      setSrc(newUrl)
    })

    return () => {
      cancelled = true
    }
  }, [item?.dataUrl, item?.mediaId])

  // 언마운트 시 마지막 URL 해제
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
    }
  }, [])

  return src
}
