import { useState, useEffect } from 'react'
import {
  User,
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  Plus,
  UserPlus,
  Coins,
} from 'lucide-react'
import { toast } from 'sonner'
import type { MenuComponentProps } from '../../types/custom-menu'
import type { ExpeditionCharacter } from '../../types/loa'
import {
  fetchCharacterSiblings,
  fetchCharacterProfile,
} from '../../features/characterSearch/loaApi'
import { supabase } from '../../lib/supabase'
import { raidList } from '../../lib/raid-list'

const MAX_CHARACTERS = 20
const DEFAULT_CHARACTERS = 6

interface PersonalCharacter {
  id: string
  user_id: string
  character_name: string
  character_class: string
  item_level: number
  server_name: string
  combat_power: string | null
  display_order: number
  created_at: string
  updated_at: string
}

interface PersonalCharacterRaid {
  id: string
  user_id: string
  character_id: string
  raid_name: string
  min_item_level: number
  is_cleared: boolean
  clear_gold: number
  can_receive_gold: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export function PersonalMenuComponent({ menu }: MenuComponentProps) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)
  const [characters, setCharacters] = useState<PersonalCharacter[]>([])
  const [characterRaids, setCharacterRaids] = useState<
    Record<string, PersonalCharacterRaid[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAddCharacterInput, setShowAddCharacterInput] = useState(false)
  const [addCharacterKeyword, setAddCharacterKeyword] = useState('')
  const userId = menu.user_id

  // 등록된 캐릭터 불러오기
  useEffect(() => {
    fetchCharacters()
  }, [userId])

  const fetchCharacters = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('personal_characters')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true })

      if (error) throw error
      setCharacters(data || [])

      // 각 캐릭터의 레이드 정보 불러오기
      if (data && data.length > 0) {
        await fetchAllCharacterRaids(data.map((c) => c.id))
      }
    } catch (error) {
      console.error('Error fetching characters:', error)
      toast.error('캐릭터 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 모든 캐릭터의 레이드 정보 불러오기
  const fetchAllCharacterRaids = async (characterIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('personal_character_raids')
        .select('*')
        .in('character_id', characterIds)
        .order('display_order', { ascending: true })

      if (error) throw error

      // 캐릭터 ID별로 레이드 그룹화
      const raidsByCharacter: Record<string, PersonalCharacterRaid[]> = {}
      data?.forEach((raid) => {
        if (!raidsByCharacter[raid.character_id]) {
          raidsByCharacter[raid.character_id] = []
        }
        raidsByCharacter[raid.character_id].push(raid)
      })

      setCharacterRaids(raidsByCharacter)
    } catch (error) {
      console.error('Error fetching character raids:', error)
    }
  }

  // 캐릭터 레벨에 맞는 레이드 3개 찾기
  const findSuitableRaids = (itemLevel: number) => {
    // 캐릭터가 입장 가능한 레이드 필터링
    const availableRaids = raidList.filter(
      (raid) => itemLevel >= raid.minItemLevel,
    )

    // 레벨 기준 내림차순 정렬 후 상위 3개 선택
    return availableRaids
      .sort((a, b) => b.minItemLevel - a.minItemLevel)
      .slice(0, 3)
  }

  // 캐릭터 검색 및 자동 등록
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      toast.error('캐릭터 이름을 입력해주세요.')
      return
    }

    try {
      setIsSearching(true)

      // 1. 캐릭터 검색
      const siblings = await fetchCharacterSiblings(searchKeyword.trim())

      if (!siblings || siblings.length === 0) {
        toast.error('캐릭터를 찾을 수 없습니다.')
        return
      }

      // 2. 각 캐릭터의 전투력 정보 가져오기
      const charactersWithStats = await Promise.all(
        siblings.map(async (c) => {
          const profile = await fetchCharacterProfile(c.CharacterName)
          return {
            CharacterName: c.CharacterName,
            ItemLevel: Number(c.ItemAvgLevel.replace(/,/g, '')),
            ServerName: c.ServerName,
            CharacterClassName: c.CharacterClassName,
            CombatPower: profile?.CombatPower,
          }
        }),
      )

      // 3. 아이템 레벨 기준으로 정렬하여 상위 6개 선택
      const topCharacters = charactersWithStats
        .sort((a, b) => b.ItemLevel - a.ItemLevel)
        .slice(0, DEFAULT_CHARACTERS)

      // 4. 기존 캐릭터 모두 삭제 (CASCADE로 레이드도 자동 삭제됨)
      const { error: deleteError } = await supabase
        .from('personal_characters')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // 5. 새로운 캐릭터 등록
      const charactersToInsert = topCharacters.map((char, index) => ({
        user_id: userId,
        character_name: char.CharacterName,
        character_class: char.CharacterClassName,
        item_level: char.ItemLevel,
        server_name: char.ServerName,
        combat_power: char.CombatPower || null,
        display_order: index,
      }))

      const { data: insertedCharacters, error: insertError } = await supabase
        .from('personal_characters')
        .insert(charactersToInsert)
        .select()

      if (insertError) throw insertError

      // 6. 각 캐릭터에 레벨에 맞는 레이드 3개 자동 추가
      if (insertedCharacters) {
        const raidsToInsert: any[] = []

        insertedCharacters.forEach((char) => {
          const suitableRaids = findSuitableRaids(char.item_level)
          suitableRaids.forEach((raid, index) => {
            raidsToInsert.push({
              user_id: userId,
              character_id: char.id,
              raid_name: raid.name,
              min_item_level: raid.minItemLevel,
              clear_gold: raid.clearGold,
              is_cleared: false,
              can_receive_gold: true,
              display_order: index,
            })
          })
        })

        if (raidsToInsert.length > 0) {
          const { error: raidsError } = await supabase
            .from('personal_character_raids')
            .insert(raidsToInsert)

          if (raidsError) throw raidsError
        }
      }

      toast.success(
        `상위 ${topCharacters.length}개 캐릭터와 레이드가 등록되었습니다.`,
      )
      setSearchKeyword('')
      fetchCharacters()
    } catch (error) {
      console.error('Error searching characters:', error)
      toast.error('캐릭터 검색에 실패했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  // 개별 캐릭터 추가
  const handleAddCharacter = async () => {
    if (!addCharacterKeyword.trim()) {
      toast.error('캐릭터 이름을 입력해주세요.')
      return
    }

    if (characters.length >= MAX_CHARACTERS) {
      toast.error(`최대 ${MAX_CHARACTERS}개까지만 등록할 수 있습니다.`)
      return
    }

    try {
      setIsAddingCharacter(true)

      // 1. 캐릭터 검색
      const siblings = await fetchCharacterSiblings(addCharacterKeyword.trim())

      if (!siblings || siblings.length === 0) {
        toast.error('캐릭터를 찾을 수 없습니다.')
        return
      }

      // 2. 검색된 캐릭터 중 가장 레벨이 높은 캐릭터 선택
      const sortedCharacters = siblings.sort((a, b) => {
        const aLevel = Number(a.ItemAvgLevel.replace(/,/g, ''))
        const bLevel = Number(b.ItemAvgLevel.replace(/,/g, ''))
        return bLevel - aLevel
      })

      const targetCharacter = sortedCharacters[0]
      const profile = await fetchCharacterProfile(targetCharacter.CharacterName)

      // 3. 이미 등록된 캐릭터인지 확인
      const existingCharacter = characters.find(
        (c) => c.character_name === targetCharacter.CharacterName,
      )

      if (existingCharacter) {
        toast.error('이미 등록된 캐릭터입니다.')
        return
      }

      // 4. 새로운 display_order 계산
      const maxOrder =
        characters.length > 0
          ? Math.max(...characters.map((c) => c.display_order))
          : -1

      // 5. 캐릭터 등록
      const characterToInsert = {
        user_id: userId,
        character_name: targetCharacter.CharacterName,
        character_class: targetCharacter.CharacterClassName,
        item_level: Number(targetCharacter.ItemAvgLevel.replace(/,/g, '')),
        server_name: targetCharacter.ServerName,
        combat_power: profile?.CombatPower || null,
        display_order: maxOrder + 1,
      }

      const { data: insertedCharacter, error: insertError } = await supabase
        .from('personal_characters')
        .insert(characterToInsert)
        .select()
        .single()

      if (insertError) throw insertError

      // 6. 레벨에 맞는 레이드 3개 자동 추가
      if (insertedCharacter) {
        const suitableRaids = findSuitableRaids(insertedCharacter.item_level)
        const raidsToInsert = suitableRaids.map((raid, index) => ({
          user_id: userId,
          character_id: insertedCharacter.id,
          raid_name: raid.name,
          min_item_level: raid.minItemLevel,
          clear_gold: raid.clearGold,
          is_cleared: false,
          can_receive_gold: true,
          display_order: index,
        }))

        if (raidsToInsert.length > 0) {
          const { error: raidsError } = await supabase
            .from('personal_character_raids')
            .insert(raidsToInsert)

          if (raidsError) throw raidsError
        }
      }

      toast.success(`${targetCharacter.CharacterName} 캐릭터가 추가되었습니다.`)
      setAddCharacterKeyword('')
      setShowAddCharacterInput(false)
      fetchCharacters()
    } catch (error) {
      console.error('Error adding character:', error)
      toast.error('캐릭터 추가에 실패했습니다.')
    } finally {
      setIsAddingCharacter(false)
    }
  }

  // 캐릭터 삭제
  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('이 캐릭터를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('personal_characters')
        .delete()
        .eq('id', characterId)
        .eq('user_id', userId)

      if (error) throw error

      toast.success('캐릭터가 삭제되었습니다.')
      fetchCharacters()
    } catch (error) {
      console.error('Error deleting character:', error)
      toast.error('캐릭터 삭제에 실패했습니다.')
    }
  }

  // 레이드 클리어 상태 토글
  const handleToggleRaidCleared = async (
    raidId: string,
    currentStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from('personal_character_raids')
        .update({ is_cleared: !currentStatus })
        .eq('id', raidId)
        .eq('user_id', userId)

      if (error) throw error

      // 로컬 상태 업데이트
      setCharacterRaids((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((charId) => {
          updated[charId] = updated[charId].map((raid) =>
            raid.id === raidId ? { ...raid, is_cleared: !currentStatus } : raid,
          )
        })
        return updated
      })

      toast.success(currentStatus ? '클리어 해제되었습니다.' : '클리어 완료!')
    } catch (error) {
      console.error('Error toggling raid cleared:', error)
      toast.error('레이드 상태 변경에 실패했습니다.')
    }
  }

  // 골드 수령 가능 여부 토글
  const handleToggleGoldReceivable = async (
    raidId: string,
    currentStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from('personal_character_raids')
        .update({ can_receive_gold: !currentStatus })
        .eq('id', raidId)
        .eq('user_id', userId)

      if (error) throw error

      // 로컬 상태 업데이트
      setCharacterRaids((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((charId) => {
          updated[charId] = updated[charId].map((raid) =>
            raid.id === raidId
              ? { ...raid, can_receive_gold: !currentStatus }
              : raid,
          )
        })
        return updated
      })

      toast.success(
        currentStatus
          ? '골드 수령 불가로 변경되었습니다.'
          : '골드 수령 가능으로 변경되었습니다.',
      )
    } catch (error) {
      console.error('Error toggling gold receivable:', error)
      toast.error('골드 수령 상태 변경에 실패했습니다.')
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* 헤더 */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {menu.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              캐릭터를 검색하면 레벨이 높은 {DEFAULT_CHARACTERS}개 캐릭터가
              자동으로 등록됩니다 (최대 {MAX_CHARACTERS}개)
            </p>
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="min-h-100 p-6">
        <div className="max-w-360 mx-auto space-y-6">
          {/* 검색 영역 */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="캐릭터 이름을 입력하세요"
                className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSearching}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    검색
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * 검색하면 기존 캐릭터가 모두 삭제되고 새로운 상위{' '}
              {DEFAULT_CHARACTERS}개 캐릭터로 교체됩니다.
            </p>
          </div>

          {/* 캐릭터 목록 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                등록된 캐릭터 ({characters.length}/{MAX_CHARACTERS})
              </h3>

              {/* 캐릭터 추가 버튼 */}
              {characters.length < MAX_CHARACTERS && characters.length > 0 && (
                <button
                  onClick={() =>
                    setShowAddCharacterInput(!showAddCharacterInput)
                  }
                  className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  캐릭터 추가
                </button>
              )}
            </div>

            {/* 캐릭터 추가 입력 영역 */}
            {showAddCharacterInput && (
              <div className="bg-muted/30 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addCharacterKeyword}
                    onChange={(e) => setAddCharacterKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCharacter()
                      if (e.key === 'Escape') {
                        setShowAddCharacterInput(false)
                        setAddCharacterKeyword('')
                      }
                    }}
                    placeholder="추가할 캐릭터 이름을 입력하세요"
                    className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isAddingCharacter}
                    autoFocus
                  />
                  <button
                    onClick={handleAddCharacter}
                    disabled={isAddingCharacter}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCharacter ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        추가
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCharacterInput(false)
                      setAddCharacterKeyword('')
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    취소
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * 검색된 캐릭터 중 가장 레벨이 높은 캐릭터가 추가됩니다.
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : characters.length === 0 ? (
              <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
                등록된 캐릭터가 없습니다. 캐릭터를 검색해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {characters.map((char, index) => {
                  const raids = characterRaids[char.id] || []
                  const clearedCount = raids.filter((r) => r.is_cleared).length

                  return (
                    <div
                      key={char.id}
                      className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* 캐릭터 헤더 */}
                      <div className="p-4 bg-muted/30 relative">
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={() => handleDeleteCharacter(char.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-start gap-3 pr-8">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-foreground truncate">
                              {char.character_name}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {char.character_class}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="font-medium text-primary">
                                Lv. {char.item_level.toLocaleString()}
                              </span>
                              <span>•</span>
                              <span className="truncate">
                                {char.server_name}
                              </span>
                            </div>
                            {char.combat_power && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                전투력 {char.combat_power}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 레이드 목록 */}
                      {raids.length > 0 && (
                        <div className="p-4 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              레이드
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {clearedCount}/{raids.length}
                              </span>
                              <span className="text-xs text-yellow-500 font-medium">
                                {raids
                                  .filter((r) => r.can_receive_gold)
                                  .reduce((sum, r) => sum + r.clear_gold, 0)
                                  .toLocaleString()}
                                G
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {raids.map((raid) => (
                              <div
                                key={raid.id}
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                {/* 클리어 체크박스 */}
                                <button
                                  className="shrink-0 transition-colors mt-0.5"
                                  onClick={() =>
                                    handleToggleRaidCleared(
                                      raid.id,
                                      raid.is_cleared,
                                    )
                                  }
                                >
                                  {raid.is_cleared ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                  )}
                                </button>

                                {/* 레이드 정보 */}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-xs font-medium leading-tight ${raid.is_cleared ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                  >
                                    {raid.raid_name}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>입장 {raid.min_item_level}</span>
                                    <span>•</span>
                                    <span className="text-yellow-500 font-medium">
                                      {raid.clear_gold.toLocaleString()}G
                                    </span>
                                  </div>
                                </div>

                                {/* 골드 수령 가능 토글 */}
                                <button
                                  className="flex-shrink-0 transition-colors mt-0.5"
                                  onClick={() =>
                                    handleToggleGoldReceivable(
                                      raid.id,
                                      raid.can_receive_gold,
                                    )
                                  }
                                  title={
                                    raid.can_receive_gold
                                      ? '골드 수령 가능'
                                      : '골드 수령 불가'
                                  }
                                >
                                  <Coins
                                    className={`w-4 h-4 ${
                                      raid.can_receive_gold
                                        ? 'text-yellow-500'
                                        : 'text-muted-foreground'
                                    } hover:scale-110 transition-transform`}
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
