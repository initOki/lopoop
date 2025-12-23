import { supabase } from './supabase'
import { MenuType } from '../types/custom-menu'
import type { CustomMenu } from '../types/custom-menu'

export enum MenuPermission {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  MANAGE_MEMBERS = 'manage_members'
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export interface MenuAccessInfo {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  role?: MemberRole
  reason?: string
}

/**
 * 사용자의 메뉴 접근 권한을 확인합니다
 * 요구사항 7.3: 메뉴 접근 권한 확인
 */
export async function checkMenuAccess(
  menuId: string, 
  userId: string
): Promise<MenuAccessInfo> {
  try {
    // 메뉴 정보 가져오기
    const { data: menu, error: menuError } = await supabase
      .from('custom_menus')
      .select('*')
      .eq('id', menuId)
      .single()

    if (menuError || !menu) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        reason: '메뉴를 찾을 수 없습니다'
      }
    }

    // 메뉴 소유자인 경우 모든 권한
    if (menu.user_id === userId) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageMembers: true,
        role: MemberRole.OWNER
      }
    }

    // 그룹 메뉴가 아닌 경우 소유자만 접근 가능
    if (menu.type !== MenuType.GROUP) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        reason: '개인 메뉴는 소유자만 접근할 수 있습니다'
      }
    }

    // 그룹 메뉴의 경우 멤버십 확인
    const { data: membership, error: memberError } = await supabase
      .from('menu_members')
      .select('*')
      .eq('menu_id', menuId)
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      // 비공개 그룹인지 확인
      const config = menu.config as any
      const isPrivate = config?.isPrivate || false

      if (isPrivate) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          reason: '비공개 그룹입니다'
        }
      }

      // 공개 그룹의 경우 읽기 전용 접근
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        reason: '그룹 멤버가 아닙니다'
      }
    }

    // 멤버 역할에 따른 권한 설정
    const role = membership.role as MemberRole
    
    switch (role) {
      case MemberRole.ADMIN:
        return {
          canView: true,
          canEdit: true,
          canDelete: false, // 관리자는 삭제 불가
          canManageMembers: true,
          role
        }
      
      case MemberRole.MEMBER:
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          role
        }
      
      default:
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          role
        }
    }
  } catch (error) {
    console.error('Error checking menu access:', error)
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      reason: '권한 확인 중 오류가 발생했습니다'
    }
  }
}

/**
 * 사용자가 볼 수 있는 메뉴 목록을 필터링합니다
 * 요구사항 7.3: 동적 가시성 업데이트
 */
export async function getVisibleMenusForUser(userId: string): Promise<CustomMenu[]> {
  try {
    // 1. 사용자가 소유한 메뉴
    const { data: ownedMenus, error: ownedError } = await supabase
      .from('custom_menus')
      .select('*')
      .eq('user_id', userId)
      .order('menu_order', { ascending: true })

    if (ownedError) {
      console.error('Error fetching owned menus:', ownedError)
      return []
    }

    // 2. 사용자가 멤버인 그룹 메뉴
    const { data: memberMenus, error: memberError } = await supabase
      .from('menu_members')
      .select(`
        menu_id,
        custom_menus (*)
      `)
      .eq('user_id', userId)

    if (memberError) {
      console.error('Error fetching member menus:', memberError)
      return ownedMenus || []
    }

    // 3. 공개 그룹 메뉴 (사용자가 멤버가 아닌 것들)
    const memberMenuIds = memberMenus?.map(m => m.menu_id) || []
    const ownedMenuIds = ownedMenus?.map(m => m.id) || []
    const excludeIds = [...memberMenuIds, ...ownedMenuIds]

    let publicGroupMenus: CustomMenu[] = []
    if (excludeIds.length > 0) {
      const { data: publicMenus, error: publicError } = await supabase
        .from('custom_menus')
        .select('*')
        .eq('type', MenuType.GROUP)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('menu_order', { ascending: true })

      if (!publicError && publicMenus) {
        // 비공개가 아닌 메뉴만 필터링
        publicGroupMenus = publicMenus.filter(menu => {
          const config = menu.config as any
          return !config?.isPrivate
        })
      }
    }

    // 모든 메뉴 합치기
    const allMenus = [
      ...(ownedMenus || []),
      ...(memberMenus?.map(m => m.custom_menus).filter(Boolean) || []),
      ...publicGroupMenus
    ]

    // 중복 제거 및 정렬
    const uniqueMenus = allMenus.reduce((acc, menu) => {
      if (menu && !acc.find(m => m.id === menu.id)) {
        acc.push(menu)
      }
      return acc
    }, [] as CustomMenu[])

    return uniqueMenus.sort((a, b) => a.menu_order - b.menu_order)
  } catch (error) {
    console.error('Error getting visible menus:', error)
    return []
  }
}

/**
 * 메뉴 멤버의 역할을 변경합니다
 */
export async function updateMemberRole(
  menuId: string,
  targetUserId: string,
  newRole: MemberRole,
  requestingUserId: string
): Promise<boolean> {
  try {
    // 요청자의 권한 확인
    const access = await checkMenuAccess(menuId, requestingUserId)
    if (!access.canManageMembers) {
      throw new Error('멤버 관리 권한이 없습니다')
    }

    // 역할 업데이트
    const { error } = await supabase
      .from('menu_members')
      .update({ role: newRole })
      .eq('menu_id', menuId)
      .eq('user_id', targetUserId)

    if (error) {
      console.error('Error updating member role:', error)
      throw new Error('멤버 역할 변경에 실패했습니다')
    }

    return true
  } catch (error) {
    console.error('Error in updateMemberRole:', error)
    throw error
  }
}

/**
 * 그룹 메뉴의 공개/비공개 설정을 변경합니다
 */
export async function updateMenuPrivacy(
  menuId: string,
  isPrivate: boolean,
  userId: string
): Promise<boolean> {
  try {
    // 권한 확인
    const access = await checkMenuAccess(menuId, userId)
    if (!access.canEdit) {
      throw new Error('메뉴 편집 권한이 없습니다')
    }

    // 메뉴 설정 업데이트
    const { data: menu, error: fetchError } = await supabase
      .from('custom_menus')
      .select('config')
      .eq('id', menuId)
      .single()

    if (fetchError || !menu) {
      throw new Error('메뉴를 찾을 수 없습니다')
    }

    const updatedConfig = {
      ...(menu.config as Record<string, any>),
      isPrivate
    }

    const { error: updateError } = await supabase
      .from('custom_menus')
      .update({ config: updatedConfig })
      .eq('id', menuId)

    if (updateError) {
      console.error('Error updating menu privacy:', updateError)
      throw new Error('메뉴 공개 설정 변경에 실패했습니다')
    }

    return true
  } catch (error) {
    console.error('Error in updateMenuPrivacy:', error)
    throw error
  }
}

/**
 * 사용자의 메뉴 접근 권한이 변경되었는지 확인합니다
 */
export async function hasMenuAccessChanged(
  menuId: string,
  userId: string,
  lastKnownAccess: MenuAccessInfo
): Promise<boolean> {
  const currentAccess = await checkMenuAccess(menuId, userId)
  
  return (
    currentAccess.canView !== lastKnownAccess.canView ||
    currentAccess.canEdit !== lastKnownAccess.canEdit ||
    currentAccess.canDelete !== lastKnownAccess.canDelete ||
    currentAccess.canManageMembers !== lastKnownAccess.canManageMembers
  )
}