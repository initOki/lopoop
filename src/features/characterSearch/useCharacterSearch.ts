import { useEffect, useRef, useState } from 'react'
import { useCharacterSiblings } from './loaApi'

export function useCharacterSearch() {
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const throttleRef = useRef<number | null>(null)

  // 800ms 디바운스
  useEffect(() => {
    if (throttleRef.current) {
      window.clearTimeout(throttleRef.current)
    }

    throttleRef.current = window.setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 800)

    return () => {
      if (throttleRef.current) {
        window.clearTimeout(throttleRef.current)
      }
    }
  }, [keyword])

  // React Query 훅 사용
  const {
    data: characters = [],
    isLoading: loading,
    error,
    refetch,
  } = useCharacterSiblings(debouncedKeyword)

  const search = (name: string) => {
    setKeyword(name)
  }

  return {
    keyword,
    setKeyword,
    characters,
    loading,
    error,
    search,
    refetch,
  }
}
