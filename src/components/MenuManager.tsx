import React, { useState } from 'react'
import { Plus, Settings, Trash2, GripVertical, Shield, Wifi } from 'lucide-react'
import { useCustomMenus } from '../hooks/useCustomMenus'
import { MenuCreator } from './MenuCreator'
import { MenuEditor } from './MenuEditor'
import { MenuDeleteDialog } from './MenuDeleteDialog'
import { MenuPermissionManager } from './MenuPermissionManager'
import { SecurityMonitor, SecurityStatusIndicator } from './SecurityMonitor'
import { NetworkStatusIndicator } from './NetworkStatusIndicator'
import { MenuType } from '../types/custom-menu'
import type { MenuManagerProps, CustomMenu, CustomMenuInsert } from '../types/custom-menu'

/**
 * MenuManager 컴포넌트
 * 메뉴 목록 표시 및 상태 관리, 실시간 구독을 통한 메뉴 동기화
 * 요구사항: 7.1, 8.4
 */
export function MenuManager({ userId }: MenuManagerProps) {
  const { 
    menus, 
    loading, 
    error,
    hasPendingActions,
    createMenu,
    updateMenu,
    deleteMenu, 
    reorderMenus,
    syncOfflineActions
  } = useCustomMenus(userId)
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMenu, setEditingMenu] = useState<CustomMenu | null>(null)
  const [deletingMenu, setDeletingMenu] = useState<CustomMenu | null>(null)
  const [managingPermissions, setManagingPermissions] = useState<CustomMenu | null>(null)
  const [showSecurityMonitor, setShowSecurityMonitor] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // 메뉴 타입별 아이콘 매핑
  const getMenuTypeIcon = (type: MenuType) => {
    switch (type) {
      case MenuType.GROUP:
        return '👥'
      case MenuType.DASHBOARD:
        return '📊'
      case MenuType.EXTERNAL_LINK:
        return '🔗'
      case MenuType.CUSTOM_PAGE:
        return '📄'
      case MenuType.PROJECT:
        return '📁'
      default:
        return '📋'
    }
  }

  // 메뉴 타입별 한국어 이름
  const getMenuTypeName = (type: MenuType) => {
    switch (type) {
      case MenuType.GROUP:
        return '그룹'
      case MenuType.DASHBOARD:
        return '대시보드'
      case MenuType.EXTERNAL_LINK:
        return '외부 링크'
      case MenuType.CUSTOM_PAGE:
        return '커스텀 페이지'
      case MenuType.PROJECT:
        return '프로젝트'
      default:
        return '메뉴'
    }
  }

  // 메뉴 생성 처리
  const handleMenuCreate = async (menuData: Omit<CustomMenu, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const menuInsert: CustomMenuInsert = {
        name: menuData.name,
        type: menuData.type,
        config: menuData.config,
        user_id: userId,
        menu_order: menus.length // 마지막 순서로 추가
      }
      
      await createMenu(menuInsert)
      setShowCreateForm(false)
    } catch (err) {
      console.error('메뉴 생성 실패:', err)
      // 오류는 useCustomMenus에서 처리됨
    }
  }
  // 메뉴 업데이트 처리
  const handleMenuUpdate = async (updates: Partial<CustomMenu>) => {
    if (!editingMenu) return
    
    try {
      await updateMenu(editingMenu.id, updates)
      setEditingMenu(null)
    } catch (err) {
      console.error('메뉴 업데이트 실패:', err)
      // 오류는 useCustomMenus에서 처리됨
    }
  }
  // 메뉴 삭제 확인
  const handleDeleteMenu = (menu: CustomMenu) => {
    setDeletingMenu(menu)
  }

  // 메뉴 삭제 실행
  const handleConfirmDelete = async () => {
    if (!deletingMenu) return
    
    setIsDeleting(true)
    try {
      await deleteMenu(deletingMenu.id)
      setDeletingMenu(null)
    } catch (err) {
      console.error('메뉴 삭제 실패:', err)
      // 오류는 useCustomMenus에서 처리됨
    } finally {
      setIsDeleting(false)
    }
  }

  // 권한 관리 열기
  const handleManagePermissions = (menu: CustomMenu) => {
    setManagingPermissions(menu)
  }

  // 메뉴 삭제 취소
  const handleCancelDelete = () => {
    if (!isDeleting) {
      setDeletingMenu(null)
    }
  }

  // 드래그 앤 드롭 처리
  const handleDragStart = (e: React.DragEvent, menuId: string) => {
    setDraggedItem(menuId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetMenuId: string) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === targetMenuId) {
      setDraggedItem(null)
      return
    }

    const draggedIndex = menus.findIndex(menu => menu.id === draggedItem)
    const targetIndex = menus.findIndex(menu => menu.id === targetMenuId)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // 새로운 순서 계산
    const newMenus = [...menus]
    const [draggedMenu] = newMenus.splice(draggedIndex, 1)
    newMenus.splice(targetIndex, 0, draggedMenu)

    // 순서 업데이트
    const menuOrders = newMenus.map((menu, index) => ({
      id: menu.id,
      order: index
    }))

    try {
      await reorderMenus(menuOrders)
    } catch (err) {
      console.error('메뉴 순서 변경 실패:', err)
    }

    setDraggedItem(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">메뉴를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="text-destructive font-medium">오류 발생</div>
        <div className="text-destructive/80 text-sm mt-1">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 space-y-4 px-[20px] py-[40px]">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">커스텀 메뉴 관리</h2>
          
          {/* 네트워크 및 보안 상태 표시 */}
          <div className="flex items-center gap-2">
            <NetworkStatusIndicator showText={false} />
            <SecurityStatusIndicator userId={userId} />
            
            {hasPendingActions && (
              <button
                onClick={syncOfflineActions}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                title="오프라인 작업 동기화"
              >
                <Wifi className="h-3 w-3" />
                동기화
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSecurityMonitor(!showSecurityMonitor)}
            className="flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="보안 모니터"
          >
            <Shield className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 메뉴 추가
          </button>
        </div>
      </div>

      {/* 보안 모니터 */}
      {showSecurityMonitor && (
        <SecurityMonitor userId={userId} className="mb-4" />
      )}

      {/* 메뉴 목록 */}
      {menus.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <div className="text-muted-foreground mb-4">생성된 커스텀 메뉴가 없습니다</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-primary hover:text-primary/80 font-medium"
          >
            첫 번째 메뉴를 만들어보세요
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {menus.map((menu) => (
            <div
              key={menu.id}
              draggable
              onDragStart={(e) => handleDragStart(e, menu.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, menu.id)}
              className={`
                flex items-center p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow cursor-move
                ${draggedItem === menu.id ? 'opacity-50' : ''}
              `}
            >
              {/* 드래그 핸들 */}
              <GripVertical className="w-4 h-4 text-muted-foreground mr-[20px]" />
              
              {/* 메뉴 아이콘 */}
              {/* <div className="text-2xl">
                {getMenuTypeIcon(menu.type as MenuType)}
              </div> */}
              
              {/* 메뉴 정보 */}
              <div className="flex-1">
                <div className="font-medium text-foreground">{menu.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getMenuTypeName(menu.type as MenuType)} • 
                  생성일: {new Date(menu.created_at).toLocaleDateString()}
                </div>
              </div>
              
              {/* 액션 버튼 */}
              <div className="flex items-center gap-2">
                {/* 권한 관리 버튼 (그룹 메뉴만) */}
                {/* {menu.type === MenuType.GROUP && (
                  <button
                    onClick={() => handleManagePermissions(menu)}
                    className="p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                    title="권한 관리"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                )} */}
                
                <button
                  onClick={() => setEditingMenu(menu)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="메뉴 편집"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteMenu(menu)}
                  className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-colors"
                  title="메뉴 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 메뉴 생성 폼 */}
      {showCreateForm && (
        <MenuCreator
          userId={userId}
          onMenuCreate={handleMenuCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* 메뉴 편집 폼 */}
      {editingMenu && (
        <MenuEditor
          userId={userId}
          menu={editingMenu}
          onMenuUpdate={handleMenuUpdate}
          onCancel={() => setEditingMenu(null)}
        />
      )}

      {/* 메뉴 삭제 확인 대화상자 */}
      {deletingMenu && (
        <MenuDeleteDialog
          menu={deletingMenu}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* 권한 관리 대화상자 */}
      {managingPermissions && (
        <MenuPermissionManager
          menu={managingPermissions}
          userId={userId}
          onClose={() => setManagingPermissions(null)}
        />
      )}
    </div>
  )
}