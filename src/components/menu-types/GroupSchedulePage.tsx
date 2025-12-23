import { RefreshCw } from 'lucide-react'
import { useSchedules } from '@/hooks/useSchedules'
import { useScheduleFilters } from '@/hooks/useScheduleFilters'
import { useSlotEditor } from '@/hooks/useSlotEditor'
import { useRaidCreator } from '@/hooks/useRaidCreator'
import ScheduleFiltersComponent from '../schedule/ScheduleFilters'
import ScheduleTable from '../schedule/ScheduleTable'
import RaidCreator from '../schedule/RaidCreator'

export default function GroupSchedulePage() {
  const {
    schedules,
    isLoading,
    deleteSchedule,
    toggleComplete,
    handleManualReset,
  } = useSchedules()

  const {
    filters,
    sort,
    filteredAndSortedSchedules,
    handleSort,
    updateFilter,
  } = useScheduleFilters(schedules)

  const {
    editingScheduleId,
    editingSlotIndex,
    editCharacters,
    selectedEditCharacter,
    getCharacterUsageCount,
    startEditSlot,
    cancelEdit,
    updateSlot,
    clearSlot,
    setEditCharacters,
    setSelectedEditCharacter,
  } = useSlotEditor(schedules)

  const {
    selectedRaid,
    selectedSlots,
    setSelectedRaid,
    setSelectedSlots,
    addSchedule,
    checkItemLevelRequirement,
    getSelectedRaidInfo,
    getSlotStatus,
    averageStats,
  } = useRaidCreator(getCharacterUsageCount)

  const selectedRaidInfo = getSelectedRaidInfo() ?? null
  const { invalidSlots } = checkItemLevelRequirement()

  const handleCharacterSearch = (chars: any[]) => {
    setEditCharacters(chars)
    if (chars.length > 0) {
      // 첫 번째 캐릭터가 3회 이상 등록되어 있으면 선택 가능한 첫 캐릭터 찾기
      const firstAvailableChar = chars.find(
        (c) =>
          getCharacterUsageCount(
            c.CharacterName,
            editingScheduleId!,
            editingSlotIndex!,
          ) < 3,
      )
      setSelectedEditCharacter(firstAvailableChar ?? null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">레이드 스케줄 관리</h2>
        <button
          onClick={handleManualReset}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={18} />
          완료 상태 초기화
        </button>
      </div>

      {/* 레이드 생성 섹션 */}
      <RaidCreator
        selectedRaid={selectedRaid}
        selectedSlots={selectedSlots}
        selectedRaidInfo={selectedRaidInfo}
        averageStats={averageStats}
        invalidSlots={invalidSlots}
        onRaidChange={setSelectedRaid}
        onSlotsChange={setSelectedSlots}
        onAddSchedule={addSchedule}
        getCharacterUsageCount={getCharacterUsageCount}
        getSlotStatus={getSlotStatus}
      />

      {/* 필터 섹션 */}
      <ScheduleFiltersComponent
        filters={filters}
        onFilterChange={updateFilter}
      />

      {/* 레이드 스케줄 테이블 */}
      <ScheduleTable
        schedules={filteredAndSortedSchedules}
        isLoading={isLoading}
        sort={sort}
        editingScheduleId={editingScheduleId}
        editingSlotIndex={editingSlotIndex}
        editCharacters={editCharacters}
        selectedEditCharacter={selectedEditCharacter}
        onSort={handleSort}
        onToggleComplete={toggleComplete}
        onDeleteSchedule={deleteSchedule}
        onStartEditSlot={startEditSlot}
        onCancelEdit={cancelEdit}
        onUpdateSlot={updateSlot}
        onClearSlot={clearSlot}
        onCharacterSearch={handleCharacterSearch}
        onCharacterSelect={setSelectedEditCharacter}
        getCharacterUsageCount={getCharacterUsageCount}
      />

      {/* 안내 문구 */}
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p>
          💡 캐릭터를 검색하고 슬롯에 선택한 후, 레이드 종류를 선택하여
          추가하세요.
        </p>
        <p>
          ⚠️ 선택한 캐릭터의 아이템 레벨이 레이드 입장 레벨보다 낮으면 추가할
          수 없습니다.
        </p>
        <p>🔄 매주 수요일 오전 6시에 완료 상태가 자동으로 초기화됩니다.</p>
      </div>
    </div>
  )
}