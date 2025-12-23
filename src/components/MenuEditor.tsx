import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import {
  MenuType,
  DEFAULT_MENU_CONFIGS,
  type CustomMenu,
  type MenuConfig,
} from '../types/custom-menu'
import { validateMenu, getUserMenuNames } from '../lib/custom-menu-utils'

export interface MenuEditorProps {
  userId: string
  menu: CustomMenu
  onMenuUpdate: (updates: Partial<CustomMenu>) => void
  onCancel: () => void
}

interface MenuFormData {
  name: string
  type: MenuType
  config: MenuConfig
}

/**
 * MenuEditor 컴포넌트
 * 기존 메뉴 설정 로드 및 편집, 메뉴 타입 변경 시 데이터 보존/경고
 * 요구사항: 5.1, 5.2, 5.4, 5.5
 */
export function MenuEditor({
  userId,
  menu,
  onMenuUpdate,
  onCancel,
}: MenuEditorProps) {
  const [formData, setFormData] = useState<MenuFormData>({
    name: menu.name,
    type: menu.type as MenuType,
    config:
      (menu.config as MenuConfig) ||
      DEFAULT_MENU_CONFIGS[menu.type as MenuType],
  })

  const [originalData] = useState<MenuFormData>({
    name: menu.name,
    type: menu.type as MenuType,
    config:
      (menu.config as MenuConfig) ||
      DEFAULT_MENU_CONFIGS[menu.type as MenuType],
  })

  const [existingNames, setExistingNames] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [typeChangeWarning] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 기존 메뉴 이름 로드 (현재 메뉴 제외)
  useEffect(() => {
    const loadExistingNames = async () => {
      try {
        const names = await getUserMenuNames(userId)
        // 현재 편집 중인 메뉴 이름은 제외
        setExistingNames(names.filter((name) => name !== menu.name))
      } catch (error) {
        console.error('기존 메뉴 이름 로드 실패:', error)
      }
    }

    loadExistingNames()
  }, [userId, menu.name])

  // 변경사항 감지
  useEffect(() => {
    const changed =
      formData.name !== originalData.name ||
      formData.type !== originalData.type ||
      JSON.stringify(formData.config) !== JSON.stringify(originalData.config)

    setHasChanges(changed)
  }, [formData, originalData])

  // 메뉴 이름 변경 시 검증
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }))
    validateForm(name, formData.type, formData.config)
  }

  // 폼 검증
  const validateForm = (name: string, type: MenuType, config: MenuConfig) => {
    const validation = validateMenu(name, type, config, existingNames)
    setValidationErrors(validation.errors)
    setValidationWarnings(validation.warnings)
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validationErrors.length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const updates: Partial<CustomMenu> = {}

      if (formData.name !== originalData.name) {
        updates.name = formData.name.trim()
      }

      if (formData.type !== originalData.type) {
        updates.type = formData.type
      }

      if (
        JSON.stringify(formData.config) !== JSON.stringify(originalData.config)
      ) {
        updates.config = formData.config
      }

      if (Object.keys(updates).length > 0) {
        await onMenuUpdate(updates)
      }
    } catch (error) {
      console.error('메뉴 업데이트 실패:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-white">메뉴 편집</h2>
            <p className="text-sm text-gray-500 mt-1">
              생성일: {new Date(menu.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 메뉴 이름 입력 */}
          <div>
            <label
              htmlFor="menu-name"
              className="block text-sm font-medium text-white mb-2"
            >
              메뉴 이름 *
            </label>
            <input
              id="menu-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="메뉴 이름을 입력하세요"
              className={`
                text-gray-600 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors
                ${validationErrors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              `}
              maxLength={100}
              required
            />
            <div className="mt-1 text-xs text-gray-500">
              한국어, 영어, 숫자, 특수문자 사용 가능 (최대 100자)
            </div>
          </div>

          {/* 메뉴 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              메뉴 타입
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted">
              <span className="text-lg">👥</span>
              <span className="text-foreground">개인 페이지</span>
            </div>
          </div>

          {/* 타입 변경 경고 */}
          {typeChangeWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800 mb-1">
                    타입 변경 알림
                  </div>
                  <p className="text-yellow-700 text-sm">{typeChangeWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* 선택된 메뉴 타입 정보 */}
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{selectedTypeInfo.icon}</div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">
                  {selectedTypeInfo.name}
                  {formData.type !== originalData.type && (
                    <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      변경됨
                    </span>
                  )}
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                  {selectedTypeInfo.description}
                </p>
                <div>
                  <div className="text-xs font-medium text-blue-800 mb-1">제공 기능:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTypeInfo.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* 검증 오류 표시 */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-red-800 mb-1">입력 오류</div>
                  <ul className="text-red-700 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 검증 경고 표시 */}
          {validationWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800 mb-1">
                    주의사항
                  </div>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {/* {hasChanges && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  변경사항 취소
                </button>
              )} */}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-white bg-gray-900 cursor-pointer rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={
                  validationErrors.length > 0 ||
                  !formData.name.trim() ||
                  !hasChanges ||
                  isSubmitting
                }
                className="px-4 py-2 bg-gray-900 text-white rounded-lg  cursor-pointer disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
