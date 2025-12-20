import { useQuery } from '@tanstack/react-query'

const API_BASE = 'https://developer-lostark.game.onstove.com'

export type CharacterSummary = {
  ServerName: string
  CharacterName: string
  CharacterLevel: number
  CharacterClassName: string
  ItemAvgLevel: string
}

export type CharacterProfile = {
  CharacterName: string
  CharacterClassName: string
  ServerName: string
  CharacterLevel: number
  ItemAvgLevel: string
  CombatPower?: string
}

export async function fetchCharacterSiblings(
  characterName: string,
): Promise<CharacterSummary[]> {
  const apiKey = import.meta.env.VITE_LOA_API_KEY

  const res = await fetch(
    `${API_BASE}/characters/${encodeURIComponent(characterName)}/siblings`,
    {
      headers: {
        accept: 'application/json',
        authorization: `bearer ${apiKey}`,
      },
    },
  )

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Error Response:', errorText)
    throw new Error(`캐릭터 검색 실패 (${res.status})`)
  }

  return res.json()
}

// 캐릭터 프로필 정보 가져오기 (전투력 포함)
export async function fetchCharacterProfile(
  characterName: string,
): Promise<CharacterProfile | null> {
  const apiKey = import.meta.env.VITE_LOA_API_KEY

  try {
    const res = await fetch(
      `${API_BASE}/armories/characters/${encodeURIComponent(characterName)}/profiles`,
      {
        headers: {
          accept: 'application/json',
          authorization: `bearer ${apiKey}`,
        },
      },
    )

    if (!res.ok) {
      console.error(`프로필 조회 실패 (${res.status}): ${characterName}`)
      return null
    }

    return res.json()
  } catch (error) {
    console.error(`프로필 조회 오류: ${characterName}`, error)
    return null
  }
}

// React Query 훅들
export function useCharacterSiblings(characterName: string) {
  return useQuery({
    queryKey: ['character-siblings', characterName],
    queryFn: () => fetchCharacterSiblings(characterName),
    enabled: !!characterName && characterName.length > 0,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 2,
  })
}

export function useCharacterProfile(characterName: string) {
  return useQuery({
    queryKey: ['character-profile', characterName],
    queryFn: () => fetchCharacterProfile(characterName),
    enabled: !!characterName && characterName.length > 0,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 2,
  })
}
