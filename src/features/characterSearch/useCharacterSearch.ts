import { useEffect, useRef, useState } from 'react'
import { fetchCharacterSiblings, type CharacterSummary } from './loaApi'

export function useCharacterSearch() {
  const [keyword, setKeyword] = useState('')
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(false)
  const throttleRef = useRef<number | null>(null)

  const search = async (name: string) => {
    if (!name) return
    setLoading(true)
    try {
      const result = await fetchCharacterSiblings(name)
      setCharacters(result)
    } finally {
      setLoading(false)
    }
  }

  // 쓰로틀 (800ms)
  useEffect(() => {
    if (!keyword) return

    if (throttleRef.current) {
      window.clearTimeout(throttleRef.current)
    }

    throttleRef.current = window.setTimeout(() => {
      search(keyword)
    }, 800)
  }, [keyword])

  return {
    keyword,
    setKeyword,
    characters,
    loading,
    search,
  }
}
