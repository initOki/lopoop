const API_BASE = 'https://developer-lostark.game.onstove.com'

export type CharacterSummary = {
  ServerName: string
  CharacterName: string
  CharacterLevel: number
  CharacterClassName: string
  ItemAvgLevel: string
}

export async function fetchCharacterSiblings(
  characterName: string,
): Promise<CharacterSummary[]> {
  const apiKey = import.meta.env.VITE_LOA_API_KEY
  
  console.log('API Key:', apiKey)
  console.log('API Key 길이:', apiKey.length)

  const res = await fetch(
    `${API_BASE}/characters/${encodeURIComponent(characterName)}/siblings`,
    {
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${apiKey}`,
      },
    },
  )

  console.log('Status:', res.status)

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Error Response:', errorText)
    throw new Error(`캐릭터 검색 실패 (${res.status})`)
  }

  return res.json()
}