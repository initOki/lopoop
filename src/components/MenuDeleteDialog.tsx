import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { MenuType } from '../types/custom-menu'
import type { CustomMenu } from '../types/custom-menu'

interface MenuDeleteDialogProps {
  menu: CustomMenu
  onConfirm: () => Promise<void>
  onCancel: () => void
  isDeleting?: boolean
}

/**
 * 메뉴 삭제 확인 대화상자
 * 요구사항 6.1: 메뉴 세부사항과 결과를 보여주는 확인 대화상자 표시
 */
export function MenuDeleteDialog({
  menu,
  onConfirm,
  onCancel,
  isDeleting = false,
}: MenuDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  // 메뉴 타입별 한국어 이름
  const getMenuTypeName = (type: string) => {
    switch (type as MenuType) {
      case MenuType.GROUP:
        return '그룹'
      default:
        return '메뉴'
    }
  }

  // 메뉴 타입별 아이콘
  const getMenuTypeIcon = (type: string) => {
    switch (type as MenuType) {
      case MenuType.GROUP:
        return '👥'
      default:
        return '📋'
    }
  }

  // 삭제 영향 분석
  const getDeletionImpact = () => {
    const impacts = []

    if (menu.type === MenuType.GROUP) {
      impacts.push('그룹 멤버들이 이 메뉴에 접근할 수 없게 됩니다')
      impacts.push('그룹 내 공지사항과 스케줄이 삭제됩니다')
    }

    impacts.push('네비게이션에서 메뉴 항목이 제거됩니다')
    impacts.push('30일 후 완전히 삭제되며, 그 전까지는 복구 가능합니다')

    return impacts
  }

  const handleConfirm = async () => {
    if (confirmText !== menu.name) {
      return
    }

    try {
      await onConfirm()
    } catch (error) {
      console.error('메뉴 삭제 실패:', error)
    }
  }

  const isConfirmValid = confirmText === menu.name

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              메뉴 삭제 확인
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            disabled={isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메뉴 정보 */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl">{getMenuTypeIcon(menu.type)}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{menu.name}</div>
              <div className="text-sm text-gray-500">
                {getMenuTypeName(menu.type)} • 생성일:{' '}
                {new Date(menu.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* 경고 메시지 */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-red-800 mb-2">
                  이 작업은 되돌릴 수 없습니다
                </div>
                <div className="text-sm text-red-700">
                  메뉴를 삭제하면 다음과 같은 영향이 있습니다:
                </div>
              </div>
            </div>
          </div>

          {/* 삭제 영향 목록 */}
          <div className="space-y-2">
            {getDeletionImpact().map((impact, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <div>{impact}</div>
              </div>
            ))}
          </div>

          {/* 세부 정보 토글 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showDetails ? '세부 정보 숨기기' : '세부 정보 보기'}
          </button>

          {/* 세부 정보 */}
          {showDetails && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
              <div>
                <span className="font-medium">메뉴 ID:</span> {menu.id}
              </div>
              <div>
                <span className="font-medium">생성일:</span>{' '}
                {new Date(menu.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">마지막 수정:</span>{' '}
                {new Date(menu.updated_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">순서:</span> {menu.menu_order}
              </div>
              {menu.type === MenuType.GROUP && (
                <div>
                  <span className="font-medium">그룹 타입:</span> 다른
                  사용자에게 영향을 줄 수 있음
                </div>
              )}
            </div>
          )}

          {/* 확인 입력 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              삭제를 확인하려면 메뉴 이름을 정확히 입력하세요:
            </label>
            <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              {menu.name}
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="메뉴 이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={isDeleting}
            />
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${
                isConfirmValid && !isDeleting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                메뉴 삭제
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
