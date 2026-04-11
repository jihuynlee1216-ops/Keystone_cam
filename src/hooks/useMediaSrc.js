import { useState, useEffect, useRef } from 'react'
import { getMedia } from '../store/mediaDB'

/**
 * item.dataUrl  → 이미지(base64) 또는 현재 세션의 임시 blob URL
 * item.mediaId  → IndexedDB에 저장된 미디어 키
 *
 * 반환값: 실제 렌더링에 쓸 src 문자열 (null이면 로딩 중 또는 없음)
 *
 * 로직:
 *  1. dataUrl이 base64(data:)인 경우 → 직접 사용 (항상 유효)
 *  2. dataUrl이 blob URL이고 mediaId도 있는 경우 (영상 등)
 *     → 즉시 blob URL로 시작하고, 동시에 IDB에서도 로드
 *     → IDB 성공 시 fresh blob URL로 교체 (재시작 후에도 동작)
 *  3. dataUrl이 없고 mediaId만 있는 경우 → IDB에서만 로드
 */
export function useMediaSrc(item) {
  const [src, setSrc] = useState(() => {
    // base64는 초기값으로 바로 사용 가능; blob URL은 세션 중에는 유효
    return item?.dataUrl || null
  })
  const activeUrlRef = useRef(null) // 현재 살아있는 objectUrl 추적

  useEffect(() => {
    if (!item) {
      setSrc(null)
      return
    }

    let cancelled = false

    const loadFromIDB = () => {
      if (!item.mediaId) return
      getMedia(item.mediaId)
        .then(blob => {
          if (cancelled || !blob) return
          const newUrl = URL.createObjectURL(blob)
          if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current)
          activeUrlRef.current = newUrl
          setSrc(newUrl)
        })
        .catch(() => { }) // IDB 로드 실패 시 현재 src 유지
    }

    const dataUrl = item.dataUrl

    if (dataUrl && !dataUrl.startsWith('blob:')) {
      // base64 또는 일반 URL → 항상 유효, 직접 사용
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
      setSrc(dataUrl)
    } else if (dataUrl && dataUrl.startsWith('blob:')) {
      // blob URL: 현재 세션에선 유효 → 즉시 표시
      // 동시에 IDB에서도 로드해두기 (재시작 후 HYDRATE가 null로 바꾸면 IDB URL로 교체됨)
      if (activeUrlRef.current !== dataUrl) {
        if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
      setSrc(dataUrl)
      // IDB에도 백업이 있으면 더 견고한 URL로 조용히 교체
      loadFromIDB()
    } else if (item.mediaId) {
      // dataUrl 없음 (재시작 후 HYDRATE가 null로 바꾼 경우) → IDB에서 로드
      loadFromIDB()
    } else {
      setSrc(null)
    }

    return () => {
      cancelled = true
    }
  }, [item?.dataUrl, item?.mediaId])

  // 언마운트 시 마지막 objectURL 해제
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
