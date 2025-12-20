import { Plus, AlertCircle, Heart, Swords, X } from 'lucide-react'
import RaidSetup from '@/features/raidSetup/RaidSetup'
import { getClassRole } from '@/utils/classUtils'
import type { ExpeditionCharacter } from '@/types/loa'
import type { RaidInfo } from '@/lib/raid-list'

type Props = {
  selectedRaid: string
  selectedSlots: (ExpeditionCharacter | null)[]
  selectedRaidInfo: RaidInfo | null
  averageStats: number | null
  invalidSlots: number[]
  onRaidChange: (raid: string) => void
  onSlotsChange: (slots: (ExpeditionCharacter | null)[]) => void
  onAddSchedule: () => void
  getCharacterUsageCount: (name: string) => number
  getSlotStatus: (
    slot: ExpeditionCharacter | null,
    minLevel: number,
  ) => boolean | null
}

export default function RaidCreator({
  selectedRaid,
  selectedSlots,
  selectedRaidInfo,
  averageStats,
  invalidSlots,
  onRaidChange,
  onSlotsChange,
  onAddSchedule,
  getCharacterUsageCount,
  getSlotStatus,
}: Props) {
  return (
    <>
      {/* 캐릭터 검색 및 선택 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          캐릭터 검색 및 선택
        </h2>
        <RaidSetup
          selectedSlots={selectedSlots}
          onSlotsChange={onSlotsChange}
          selectedRaid={selectedRaid}
          onRaidChange={onRaidChange}
          getCharacterUsageCount={getCharacterUsageCount}
        />
      </div>

      {/* 레이드 추가 섹션 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">레이드 추가</h2>

        {/* 현재 선택된 슬롯 미리보기 (입장 가능 여부 표시) */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {selectedSlots.map((slot, idx) => {
            const canEnter = selectedRaidInfo
              ? getSlotStatus(slot, selectedRaidInfo.minItemLevel)
              : null

            const role = slot ? getClassRole(slot.CharacterClassName) : null
            const Icon =
              role === 'support' ? Heart : role === 'dealer' ? Swords : null

            return (
              <div
                key={idx}
                className={`rounded px-3 py-2 text-sm border ${
                  canEnter === false
                    ? 'bg-red-900/30 border-red-600'
                    : canEnter === true
                      ? 'bg-green-900/30 border-green-600'
                      : 'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">슬롯 {idx + 1}:</span>
                  <div className="flex items-center gap-1">
                    {Icon && (
                      <Icon
                        size={14}
                        className={
                          role === 'support' ? 'text-green-400' : 'text-red-400'
                        }
                      />
                    )}
                    {canEnter === false && (
                      <AlertCircle size={14} className="text-red-400" />
                    )}
                    {slot && (
                      <button
                        onClick={() => {
                          const newSlots = [...selectedSlots]
                          newSlots[idx] = null
                          onSlotsChange(newSlots)
                        }}
                        className="p-0.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        title="캐릭터 제거"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  {slot ? (
                    <>
                      <div className="text-white font-medium">
                        {slot.CharacterName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {slot.CharacterClassName}
                      </div>
                      <div
                        className={`text-xs ${
                          canEnter === false ? 'text-red-400' : 'text-gray-400'
                        }`}
                      >
                        아이템: {slot.ItemLevel.toLocaleString()}
                        {selectedRaidInfo &&
                          ` / ${selectedRaidInfo.minItemLevel}`}
                      </div>
                      {slot.CombatPower && (
                        <div className="text-xs text-blue-400">
                          전투력: {slot.CombatPower}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500">미선택</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 파티 평균 전투력 표시 */}
        {averageStats && (
          <div className="mt-3 flex items-center justify-center gap-2 bg-blue-900/30 border border-blue-600 rounded-lg px-4 py-2">
            <span className="text-blue-400 font-medium">파티 평균 전투력:</span>
            <span className="text-white font-bold text-lg">
              {averageStats.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex justify-center mt-[14px]">
          {/* 추가 버튼 */}
          <button
            onClick={onAddSchedule}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={19} />
            레이드 추가
          </button>
        </div>

        {/* 입장 불가 경고 */}
        {selectedRaidInfo && invalidSlots.length > 0 && (
          <div className="mt-4 flex items-start gap-2 bg-red-900/20 border border-red-600 rounded-lg px-4 py-3">
            <AlertCircle
              size={20}
              className="text-red-400 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm">
              <p className="text-red-400 font-medium">입장 레벨 미달</p>
              <p className="text-red-300 mt-1">
                슬롯 {invalidSlots.join(', ')}의 캐릭터가 입장 레벨(
                {selectedRaidInfo.minItemLevel})에 미달합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
