import { useEffect, useState } from 'react'
import { AlertCircle, Clock, RotateCcw, Trash2 } from 'lucide-react'
import {
  getTimeUntilExpiry,
  getUserArchivedMenus,
  isMenuRecoverable,
  restoreArchivedMenu,
} from '../lib/menu-archive-utils'
import { MenuType } from '../types/custom-menu'
import type { ArchivedMenu } from '../lib/menu-archive-utils'

interface ArchivedMenuManagerProps {
  userId: string
  onMenuRestored?: () => void
}

/**
 * 아카이브된 메뉴 관리 컴포넌트
 * 요구사항 6.3: 복구 기간 동안 메뉴 데이터 보관 및 복구 시스템
 */
export function ArchivedMenuManager({
  userId,
  onMenuRestored,
}: ArchivedMenuManagerProps) {
  const [archivedMenus, setArchivedMenus] = useState<Array<ArchivedMenu>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringMenuId, setRestoringMenuId] = useState<string | null>(null)

  // 메뉴 타입별 한국어 이름
  const getMenuTypeName = (type: string) => {
    switch (type as MenuType) {
      case MenuType.PERSONAL:
        return '개인'
      default:
        return '메뉴'
    }
  }

  // 메뉴 타입별 아이콘
  const getMenuTypeIcon = (type: string) => {
    switch (type as MenuType) {
      case MenuType.PERSONAL:
        return '👤'
      default:
        return '📋'
    }
  }

  // 아카이브된 메뉴 목록 로드
  const loadArchivedMenus = async () => {
    try {
      setLoading(true)
      setError(null)
      const menus = await getUserArchivedMenus(userId)
      setArchivedMenus(menus)
    } catch (err) {
      console.error('Error loading archived menus:', err)
      setError(
        err instanceof Error
          ? err.message
          : '아카이브된 메뉴를 불러오는데 실패했습니다',
      )
    } finally {
      setLoading(false)
    }
  }

  // 메뉴 복구
  const handleRestoreMenu = async (archivedMenu: ArchivedMenu) => {
    if (!isMenuRecoverable(archivedMenu)) {
      setError('복구 기간이 만료된 메뉴입니다')
      return
    }

    setRestoringMenuId(archivedMenu.id)
    try {
      await restoreArchivedMenu(archivedMenu.id)
      await loadArchivedMenus() // 목록 새로고침
      onMenuRestored?.()
    } catch (err) {
      console.error('Error restoring menu:', err)
      setError(err instanceof Error ? err.message : '메뉴 복구에 실패했습니다')
    } finally {
      setRestoringMenuId(null)
    }
  }

  // 남은 시간 포맷팅
  const formatTimeUntilExpiry = (archivedMenu: ArchivedMenu) => {
    const timeLeft = getTimeUntilExpiry(archivedMenu)

    if (timeLeft.expired) {
      return '만료됨'
    }

    if (timeLeft.days > 0) {
      return `${timeLeft.days}일 ${timeLeft.hours}시간`
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}시간 ${timeLeft.minutes}분`
    } else {
      return `${timeLeft.minutes}분`
    }
  }

  useEffect(() => {
    if (userId) {
      loadArchivedMenus()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">아카이브된 메뉴를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-700 font-medium">오류 발생</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button
          onClick={() => setError(null)}
          className="text-red-600 text-sm mt-2 hover:text-red-700"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          삭제된 메뉴 복구
        </h2>
        <button
          onClick={loadArchivedMenus}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          새로고침
        </button>
      </div>

      {/* 안내 메시지 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <div className="font-medium mb-1">메뉴 복구 안내</div>
            <div>
              삭제된 메뉴는 30일 동안 보관되며, 이 기간 내에 복구할 수 있습니다.
              복구된 메뉴는 이름 뒤에 "(복구됨)"이 추가됩니다.
            </div>
          </div>
        </div>
      </div>

      {/* 아카이브된 메뉴 목록 */}
      {archivedMenus.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-2">복구 가능한 메뉴가 없습니다</div>
          <div className="text-sm text-gray-400">
            삭제된 메뉴가 있다면 여기에 표시됩니다
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedMenus.map((archivedMenu) => {
            const isRecoverable = isMenuRecoverable(archivedMenu)
            const timeLeft = formatTimeUntilExpiry(archivedMenu)
            const isRestoring = restoringMenuId === archivedMenu.id

            return (
              <div
                key={archivedMenu.id}
                className={`
                  flex items-center gap-4 p-4 border rounded-lg
                  ${
                    isRecoverable
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-300 opacity-60'
                  }
                `}
              >
                {/* 메뉴 아이콘 */}
                <div className="text-2xl">
                  {getMenuTypeIcon(archivedMenu.type)}
                </div>

                {/* 메뉴 정보 */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {archivedMenu.name}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>
                      {getMenuTypeName(archivedMenu.type)} • 삭제일:{' '}
                      {new Date(archivedMenu.deleted_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span
                        className={
                          isRecoverable ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        복구 가능 기간: {timeLeft}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 복구 버튼 */}
                <div>
                  {isRecoverable ? (
                    <button
                      onClick={() => handleRestoreMenu(archivedMenu)}
                      disabled={isRestoring}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                        ${
                          isRestoring
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }
                      `}
                    >
                      {isRestoring ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          복구 중...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          복구
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm">
                      복구 불가
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
