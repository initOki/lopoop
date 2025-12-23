import { useParams, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { useCustomMenus } from '../hooks/useCustomMenus'
import { MenuTypeFactory } from './MenuTypeFactory'
import type { CustomMenu } from '../types/custom-menu'

interface MenuRouterProps {
  userId: string
}

export function MenuRouter({ userId }: MenuRouterProps) {
  const navigate = useNavigate()
  const { menuId } = useParams({ strict: false }) as { menuId?: string }
  const { menus, loading, error } = useCustomMenus(userId)
  const [currentMenu, setCurrentMenu] = useState<CustomMenu | null>(null)
  const [menuNotFound, setMenuNotFound] = useState(false)

  // Find the current menu when menuId or menus change
  useEffect(() => {
    if (!menuId || loading) {
      setCurrentMenu(null)
      setMenuNotFound(false)
      return
    }

    const menu = menus.find(m => m.id === menuId)
    if (menu) {
      setCurrentMenu(menu)
      setMenuNotFound(false)
    } else {
      setCurrentMenu(null)
      setMenuNotFound(true)
    }
  }, [menuId, menus, loading])

  // Handle menu updates
  const handleMenuUpdate = async (updates: Partial<CustomMenu>) => {
    if (!currentMenu) return

    try {
      // The useCustomMenus hook should handle the update
      // For now, we'll just update the local state
      setCurrentMenu({ ...currentMenu, ...updates })
    } catch (error) {
      console.error('Failed to update menu:', error)
      // TODO: Show error toast
    }
  }

  // Handle back navigation
  const handleBack = () => {
    navigate({ to: '/' })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">메뉴를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            메뉴를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-4">
            네트워크 연결을 확인하고 다시 시도해주세요.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft size={16} />
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // Menu not found state
  if (menuNotFound) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            메뉴를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 mb-4">
            요청하신 메뉴가 삭제되었거나 접근 권한이 없을 수 있습니다.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft size={16} />
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // No menu ID provided
  if (!menuId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            잘못된 접근입니다
          </h2>
          <p className="text-gray-600 mb-4">
            유효한 메뉴 ID가 필요합니다.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft size={16} />
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // Render the menu page using MenuTypeFactory
  if (currentMenu) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 px-[20px] py-[40px]">
        {/* Header with back button and menu title */}
        {/* <div className="bg-gray-800 rounded-xl shadow-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="뒤로 가기"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentMenu.name}
              </h1>
            </div>
          </div>
        </div> */}

        {/* Menu content */}
        <div className="py-[20px] bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
          <MenuTypeFactory
            menu={currentMenu}
            onUpdate={handleMenuUpdate}
          />
        </div>
      </div>
    )
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">처리 중...</p>
      </div>
    </div>
  )
}

export default MenuRouter