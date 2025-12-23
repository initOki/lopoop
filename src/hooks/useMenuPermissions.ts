import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { 
  checkMenuAccess, 
  getVisibleMenusForUser,
  updateMemberRole,
  updateMenuPrivacy
} from '../lib/menu-permissions'
import type { CustomMenu } from '../types/custom-menu'
import type { MenuAccessInfo, MemberRole } from '../lib/menu-permissions'

interface UseMenuPermissionsReturn {
  visibleMenus: CustomMenu[]
  loading: boolean
  error: string | null
  checkAccess: (menuId: string) => Promise<MenuAccessInfo>
  updateRole: (menuId: string, targetUserId: string, newRole: MemberRole) => Promise<boolean>
  updatePrivacy: (menuId: string, isPrivate: boolean) => Promise<boolean>
  refreshVisibleMenus: () => Promise<void>
}

/**
 * Hook for managing menu permissions and visibility
 * 요구사항 7.3: 메뉴 접근 권한 확인 및 동적 가시성 업데이트
 */
export function useMenuPermissions(userId: string): UseMenuPermissionsReturn {
  const [visibleMenus, setVisibleMenus] = useState<CustomMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 가시 메뉴 목록 로드
  const loadVisibleMenus = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const menus = await getVisibleMenusForUser(userId)
      setVisibleMenus(menus)
    } catch (err) {
      console.error('Error loading visible menus:', err)
      setError('메뉴 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 실시간 구독 설정
  useEffect(() => {
    if (!userId) return

    // 초기 로드
    loadVisibleMenus()

    // 메뉴 변경사항 구독
    const menuChannel = supabase
      .channel('menu_permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_menus'
        },
        (payload) => {
          console.log('Menu change detected:', payload)
          loadVisibleMenus()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_members',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Menu membership change detected:', payload)
          loadVisibleMenus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(menuChannel)
    }
  }, [userId, loadVisibleMenus])

  // 메뉴 접근 권한 확인
  const checkAccess = useCallback(async (menuId: string): Promise<MenuAccessInfo> => {
    try {
      return await checkMenuAccess(menuId, userId)
    } catch (err) {
      console.error('Error checking menu access:', err)
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        reason: '권한 확인 중 오류가 발생했습니다'
      }
    }
  }, [userId])

  // 멤버 역할 업데이트
  const updateRole = useCallback(async (
    menuId: string, 
    targetUserId: string, 
    newRole: MemberRole
  ): Promise<boolean> => {
    try {
      setError(null)
      const success = await updateMemberRole(menuId, targetUserId, newRole, userId)
      if (success) {
        await loadVisibleMenus() // 권한 변경 후 메뉴 목록 새로고침
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '역할 변경에 실패했습니다'
      setError(errorMessage)
      throw err
    }
  }, [userId, loadVisibleMenus])

  // 메뉴 공개 설정 업데이트
  const updatePrivacy = useCallback(async (
    menuId: string, 
    isPrivate: boolean
  ): Promise<boolean> => {
    try {
      setError(null)
      const success = await updateMenuPrivacy(menuId, isPrivate, userId)
      if (success) {
        await loadVisibleMenus() // 공개 설정 변경 후 메뉴 목록 새로고침
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '공개 설정 변경에 실패했습니다'
      setError(errorMessage)
      throw err
    }
  }, [userId, loadVisibleMenus])

  // 가시 메뉴 목록 새로고침
  const refreshVisibleMenus = useCallback(async () => {
    await loadVisibleMenus()
  }, [loadVisibleMenus])

  return {
    visibleMenus,
    loading,
    error,
    checkAccess,
    updateRole,
    updatePrivacy,
    refreshVisibleMenus
  }
}