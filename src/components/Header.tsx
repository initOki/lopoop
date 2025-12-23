import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Home,
  Menu,
  X,
  Wallet,
  Calendar,
  Users,
  FileText,
  GripVertical,
  Lock,
  Settings,
} from 'lucide-react'
import { useMenuPermissions } from '../hooks/useMenuPermissions'
import type { CustomMenu, MenuType } from '../types/custom-menu'

// Menu type icon mapping
const getMenuTypeIcon = (type: MenuType) => {
  switch (type) {
    case 'group':
      return Users
    default:
      return FileText
  }
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [draggedMenuId, setDraggedMenuId] = useState<string | null>(null)
  const [dragOverMenuId, setDragOverMenuId] = useState<string | null>(null)

  // For now, we'll use a placeholder userId. In a real app, this would come from auth context
  const userId = 'current-user' // TODO: Replace with actual user ID from auth context
  const {
    visibleMenus,
    loading: menusLoading,
    error: menusError,
    checkAccess,
  } = useMenuPermissions(userId)

  const handleCustomMenuClick = async (menu: CustomMenu) => {
    // Check access before navigation
    const access = await checkAccess(menu.id)

    if (!access.canView) {
      // Show access denied message
      alert(access.reason || '이 메뉴에 접근할 권한이 없습니다')
      return
    }

    // Navigate to the custom menu route
    window.location.href = `/menu/${menu.id}`
    setIsOpen(false)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, menuId: string) => {
    setDraggedMenuId(menuId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', menuId)
  }

  const handleDragOver = (e: React.DragEvent, menuId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverMenuId(menuId)
  }

  const handleDragLeave = () => {
    setDragOverMenuId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetMenuId: string) => {
    e.preventDefault()
    setDragOverMenuId(null)

    if (!draggedMenuId || draggedMenuId === targetMenuId) {
      setDraggedMenuId(null)
      return
    }

    // Find the dragged and target menu indices
    const draggedIndex = visibleMenus.findIndex(
      (menu) => menu.id === draggedMenuId,
    )
    const targetIndex = visibleMenus.findIndex(
      (menu) => menu.id === targetMenuId,
    )

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMenuId(null)
      return
    }

    // Check if user can reorder these menus (only owned menus can be reordered)
    const draggedMenu = visibleMenus[draggedIndex]
    const targetMenu = visibleMenus[targetIndex]

    if (draggedMenu.user_id !== userId || targetMenu.user_id !== userId) {
      alert('본인이 소유한 메뉴만 순서를 변경할 수 있습니다')
      setDraggedMenuId(null)
      return
    }

    // Create new order array (only for owned menus)
    const ownedMenus = visibleMenus.filter((menu) => menu.user_id === userId)
    const reorderedMenus = [...ownedMenus]
    const draggedOwnedIndex = reorderedMenus.findIndex(
      (menu) => menu.id === draggedMenuId,
    )
    const targetOwnedIndex = reorderedMenus.findIndex(
      (menu) => menu.id === targetMenuId,
    )

    if (draggedOwnedIndex === -1 || targetOwnedIndex === -1) {
      setDraggedMenuId(null)
      return
    }

    const [draggedOwnedMenu] = reorderedMenus.splice(draggedOwnedIndex, 1)
    reorderedMenus.splice(targetOwnedIndex, 0, draggedOwnedMenu)

    // Create order updates
    const orderUpdates = reorderedMenus.map((menu, index) => ({
      id: menu.id,
      order: index,
    }))

    try {
      // Note: We would need to implement reorderMenus in useMenuPermissions
      // For now, we'll skip the actual reordering
      console.log('Menu reordering would happen here:', orderUpdates)
    } catch (error) {
      console.error('Failed to reorder menus:', error)
      // TODO: Show error toast
    }

    setDraggedMenuId(null)
  }

  const handleDragEnd = () => {
    setDraggedMenuId(null)
    setDragOverMenuId(null)
  }

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/">
            <img src="/lopoop-logo.svg" alt="LOPOOP Logo" className="h-10" />
          </Link>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div></div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Core Navigation */}
          <div className="mb-6">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
              }}
            >
              <Home size={20} />
              <span className="font-medium">Home</span>
            </Link>

            <Link
              to="/schedule"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
              }}
            >
              <Calendar size={20} />
              <span className="font-medium">스케줄</span>
            </Link>

            <Link
              to="/debts"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
              }}
            >
              <Wallet size={20} />
              <span className="font-medium">빚 관리</span>
            </Link>

            <Link
              to="/menus"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
              }}
            >
              <Settings size={20} />
              <span className="font-medium">메뉴 관리</span>
            </Link>
          </div>

          {/* Custom Menus Section */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                커스텀 메뉴
              </h3>
              {menusLoading && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {menusError && (
              <div className="text-sm text-red-400 px-3 py-2 mb-2">
                {menusError}
              </div>
            )}

            {visibleMenus.length === 0 && !menusLoading ? (
              <div className="text-sm text-gray-500 italic px-3 py-2">
                접근 가능한 메뉴가 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {visibleMenus.map((menu: CustomMenu) => {
                  const IconComponent = getMenuTypeIcon(menu.type as MenuType)
                  const isDragging = draggedMenuId === menu.id
                  const isDragOver = dragOverMenuId === menu.id
                  const isOwned = menu.user_id === userId

                  return (
                    <div
                      key={menu.id}
                      className={`relative group ${isDragging ? 'opacity-50' : ''} ${
                        isDragOver ? 'bg-gray-700' : ''
                      }`}
                      draggable={isOwned} // Only owned menus can be dragged
                      onDragStart={
                        isOwned ? (e) => handleDragStart(e, menu.id) : undefined
                      }
                      onDragOver={(e) => handleDragOver(e, menu.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, menu.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center">
                        {/* Drag handle - only show for owned menus */}
                        {isOwned && (
                          <div className="flex-shrink-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} className="text-gray-500" />
                          </div>
                        )}

                        {/* Menu button */}
                        <button
                          onClick={() => handleCustomMenuClick(menu)}
                          className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                        >
                          <IconComponent size={20} />
                          <span className="font-medium truncate">
                            {menu.name}
                          </span>

                          {/* Access indicator */}
                          {!isOwned && (
                            <div className="flex-shrink-0">
                              {menu.type === 'group' ? (
                                <Users size={14} className="text-gray-500" />
                              ) : (
                                <Lock size={14} className="text-gray-500" />
                              )}
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Drop indicator */}
                      {isDragOver && draggedMenuId !== menu.id && (
                        <div className="absolute inset-0 border-2 border-cyan-500 rounded-lg pointer-events-none" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Demo Links Start */}

          {/* Demo Links End */}
        </nav>
      </aside>
    </>
  )
}
