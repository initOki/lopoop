import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import {
  MenuType,
  DEFAULT_MENU_CONFIGS,
  type MenuCreatorProps,
  type MenuFormData,
  type MenuConfig,
} from '../types/custom-menu'
import { validateMenu, getUserMenuNames } from '../lib/custom-menu-utils'

/**
 * MenuCreator 컴포넌트
 * 메뉴 타입 선택 인터페이스, 메뉴 이름 입력 및 검증
 * 요구사항: 1.1, 1.2, 1.3
 */
export function MenuCreator({
  userId,
  onMenuCreate,
  onCancel,
}: MenuCreatorProps) {
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    type: MenuType.PERSONAL,
    config: DEFAULT_MENU_CONFIGS[MenuType.PERSONAL],
  })

  const [existingNames, setExistingNames] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 기존 메뉴 이름 로드
  useEffect(() => {
    const loadExistingNames = async () => {
      try {
        const names = await getUserMenuNames(userId)
        setExistingNames(names)
      } catch (error) {
        console.error('기존 메뉴 이름 로드 실패:', error)
      }
    }

    loadExistingNames()
  }, [userId])

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
      await onMenuCreate({
        name: formData.name.trim(),
        type: formData.type,
        config: formData.config,
        user_id: userId,
        menu_order: 0, // 기본값, 실제로는 현재 메뉴 수 + 1로 설정
      })
    } catch (error) {
      console.error('메뉴 생성 실패:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            새 메뉴 생성
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 메뉴 이름 입력 */}
          <div>
            <label
              htmlFor="menu-name"
              className="block text-sm font-medium text-foreground mb-2"
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
                text-foreground w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors bg-background
                ${validationErrors.length > 0 ? 'border-destructive bg-destructive/10' : 'border-border'}
              `}
              maxLength={100}
              required
            />
            <div className="mt-1 text-xs text-muted-foreground">
              한국어, 영어, 숫자, 특수문자 사용 가능 (최대 100자)
            </div>
          </div>

          {/* 메뉴 타입 표시 (개인 고정) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              메뉴 타입
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted">
              <span className="text-lg">�</span>
              <span className="text-foreground">개인 페이지</span>
            </div>
          </div>

          {/* 그룹 메뉴 타입 정보 */}
          {/* <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👥</div>
              <div className="flex-1">
                <h3 className="font-medium text-primary mb-1">
                  그룹
                </h3>
                <p className="text-primary/80 text-sm mb-3">
                  그룹 스케줄링과 빚 관리 기능을 제공합니다
                </p>
                <div>
                  <div className="text-xs font-medium text-primary mb-1">제공 기능:</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-block px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                      그룹 스케줄링
                    </span>
                    <span className="inline-block px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                      빚 관리
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* 검증 오류 표시 */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-destructive mb-1">
                    입력 오류
                  </div>
                  <ul className="text-destructive/80 text-sm space-y-1">
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
            <div className="bg-yellow-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                    주의사항
                  </div>
                  <ul className="text-yellow-600 dark:text-yellow-300 text-sm space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="text-white border px-4 py-2 cursor-pointer bg-gray-900 hover:bg-muted/80 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                validationErrors.length > 0 ||
                !formData.name.trim() ||
                isSubmitting
              }
              className="text-white border cursor-pointer px-4 py-2 bg-gray-900 rounded-lg disabled:bg-gray-700 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '생성 중...' : '메뉴 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
