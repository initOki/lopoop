import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ScheduleFilters, FilterCompleted } from '@/types/schedule'

type Props = {
  filters: ScheduleFilters
  onFilterChange: (key: keyof ScheduleFilters, value: string) => void
}

export default function ScheduleFiltersComponent({
  filters,
  onFilterChange,
}: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-4">필터 및 검색</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 레이드 이름 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            레이드 이름
          </label>
          <input
            type="text"
            value={filters.raidName}
            onChange={(e) => onFilterChange('raidName', e.target.value)}
            placeholder="레이드 이름 검색..."
            className="w-full rounded bg-zinc-700 px-3 py-2 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 캐릭터 이름 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            캐릭터 이름
          </label>
          <input
            type="text"
            value={filters.character}
            onChange={(e) => onFilterChange('character', e.target.value)}
            placeholder="캐릭터 이름 검색..."
            className="w-full rounded bg-zinc-700 px-3 py-2 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 완료 상태 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            완료 상태
          </label>
          <Select
            value={filters.completed}
            onValueChange={(value) =>
              onFilterChange('completed', value as FilterCompleted)
            }
          >
            <SelectTrigger className="!h-auto py-[10px] w-full bg-zinc-700 text-white border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-gray-600">
              <SelectItem value="all" className="text-white">
                전체
              </SelectItem>
              <SelectItem value="completed" className="text-white">
                완료
              </SelectItem>
              <SelectItem value="incomplete" className="text-white">
                미완료
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
