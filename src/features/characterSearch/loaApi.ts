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
  const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyIsImtpZCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyJ9.eyJpc3MiOiJodHRwczovL2x1ZHkuZ2FtZS5vbnN0b3ZlLmNvbSIsImF1ZCI6Imh0dHBzOi8vbHVkeS5nYW1lLm9uc3RvdmUuY29tL3Jlc291cmNlcyIsImNsaWVudF9pZCI6IjEwMDAwMDAwMDA0MjIyNzYifQ.mb8d4wpANADI0wJVVeuRA4rxocDwvYH3yVb7uzRF9mpiLp22njf4wHuf4HXfzHYX3Dr23kQmqITMHNupTf7yUZUO-3wZB1Evtc-peeZ2QmhYEHapL4Dp9r4Zh62A0ZdL_MAPmv40EM4dlspU5G3yK5C0mdYdupP3AOa0eim2Nb-0JHfave796KfGCjG7XxTWC1B4Z8GJ18B_8jCj3Op1R2RZqI-uQU3j6a3CEbgsvQu7IL_iCt_9qj-ZFLHfR-iVyiQYN-blq3Sd0oJHLrPQZNkgEXWOFplvUqBCDzcZ08sdY0QtXnEa_7xDTcxXzpe_lRJGxi1ZtN3EEdjXOdpoXw'
  
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