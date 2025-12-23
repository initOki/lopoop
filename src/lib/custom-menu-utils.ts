import { supabase } from './supabase'
import { 
  MenuType,
  DEFAULT_MENU_CONFIGS
} from '../types/custom-menu'
import { 
  checkMenuDeletionImpact, 
  notifyAffectedUsers 
} from './menu-archive-utils'
import { 
  withRetry, 
  withOfflineSupport, 
  offlineActionQueue,
  processOfflineActions 
} from './network-error-handler'
import {
  validateMenuData,
  checkRateLimit,
  logSecurityEvent
} from './input-validation-security'
import type { 
  CustomMenu, 
  CustomMenuInsert, 
  CustomMenuUpdate,
  MenuMember,
  MenuMemberInsert,
  MenuConfig,
  MenuValidationResult,
  MenuLimits
} from '../types/custom-menu'

// Menu validation constants
export const MENU_LIMITS: MenuLimits = {
  maxMenusPerUser: 20,
  maxNameLength: 100,
  maxConfigSize: 10000 // bytes
}

/**
 * Validates menu data before creation or update
 */
export function validateMenu(
  name: string, 
  type: MenuType, 
  config: MenuConfig,
  existingNames: string[] = []
): MenuValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push('메뉴 이름은 필수입니다')
  } else if (name.length > MENU_LIMITS.maxNameLength) {
    errors.push(`메뉴 이름은 ${MENU_LIMITS.maxNameLength}자를 초과할 수 없습니다`)
  } else if (existingNames.includes(name.trim())) {
    errors.push('이미 존재하는 메뉴 이름입니다')
  }

  // Validate name characters (Korean, English, numbers, special chars)
  const nameRegex = /^[가-힣a-zA-Z0-9\s\-_!@#$%^&*()+=\[\]{}|;:'"<>,.?/~`]+$/
  if (name && !nameRegex.test(name)) {
    errors.push('메뉴 이름에 허용되지 않는 문자가 포함되어 있습니다')
  }

  // Validate type
  if (!Object.values(MenuType).includes(type)) {
    errors.push('유효하지 않은 메뉴 타입입니다')
  }

  // Validate config size
  const configSize = JSON.stringify(config).length
  if (configSize > MENU_LIMITS.maxConfigSize) {
    errors.push(`메뉴 설정이 너무 큽니다 (최대 ${MENU_LIMITS.maxConfigSize} bytes)`)
  }

  // Type-specific validation
  switch (type) {
    case MenuType.EXTERNAL_LINK:
      const linkConfig = config as any
      if (linkConfig.links) {
        linkConfig.links.forEach((link: any, index: number) => {
          if (!link.url || !isValidUrl(link.url)) {
            errors.push(`링크 ${index + 1}의 URL이 유효하지 않습니다`)
          }
        })
      }
      break
    
    case MenuType.CUSTOM_PAGE:
      const pageConfig = config as any
      if (pageConfig.content && pageConfig.content.length > 50000) {
        warnings.push('페이지 콘텐츠가 매우 큽니다. 성능에 영향을 줄 수 있습니다')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitizes menu input to prevent XSS and other security issues
 */
export function sanitizeMenuInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
}

/**
 * Gets the default configuration for a menu type
 */
export function getDefaultMenuConfig(type: MenuType): MenuConfig {
  return JSON.parse(JSON.stringify(DEFAULT_MENU_CONFIGS[type]))
}

/**
 * Checks if a user has reached their menu limit
 */
export async function checkMenuLimit(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('custom_menus')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Error checking menu limit:', error)
    return false
  }

  return (count || 0) < MENU_LIMITS.maxMenusPerUser
}

/**
 * Gets all existing menu names for a user
 */
export async function getUserMenuNames(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('custom_menus')
    .select('name')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user menu names:', error)
    return []
  }

  return data?.map((menu) => menu.name) || []
}

/**
 * Creates a new custom menu with enhanced security validation
 * 요구사항 8.1, 8.2: 사용자당 메뉴 수 제한, 악성 콘텐츠 검증
 */
export async function createCustomMenu(menuData: CustomMenuInsert): Promise<CustomMenu | null> {
  // Rate limiting check
  const rateLimit = checkRateLimit(menuData.user_id)
  if (!rateLimit.allowed) {
    const resetTime = new Date(rateLimit.resetTime).toLocaleTimeString()
    throw new Error(`요청 한도를 초과했습니다. ${resetTime}에 재시도하세요.`)
  }

  // Get existing menu names for validation
  const existingNames = await getUserMenuNames(menuData.user_id)
  
  // Comprehensive security validation
  const validation = validateMenuData({
    name: menuData.name,
    type: menuData.type,
    config: (menuData.config as MenuConfig) || {},
    userId: menuData.user_id,
    existingNames
  })

  if (!validation.isValid) {
    // Log security event for failed validation
    logSecurityEvent({
      userId: menuData.user_id,
      action: 'menu_creation_blocked',
      details: {
        errors: validation.errors,
        menuName: menuData.name,
        menuType: menuData.type
      },
      severity: 'medium'
    })
    
    throw new Error(`메뉴 생성 실패: ${validation.errors.join(', ')}`)
  }

  // Check menu limit
  const canCreateMenu = await checkMenuLimit(menuData.user_id)
  if (!canCreateMenu) {
    logSecurityEvent({
      userId: menuData.user_id,
      action: 'menu_limit_exceeded',
      details: {
        currentLimit: MENU_LIMITS.maxMenusPerUser,
        attemptedMenuName: menuData.name
      },
      severity: 'low'
    })
    
    throw new Error(`메뉴 생성 한도에 도달했습니다 (최대 ${MENU_LIMITS.maxMenusPerUser}개)`)
  }

  // Use sanitized data from validation
  const sanitizedData = {
    ...menuData,
    name: validation.sanitizedValue?.name || menuData.name,
    config: validation.sanitizedValue?.config || getDefaultMenuConfig(menuData.type as MenuType)
  }

  // Log successful validation
  if (validation.warnings.length > 0) {
    logSecurityEvent({
      userId: menuData.user_id,
      action: 'menu_creation_warnings',
      details: {
        warnings: validation.warnings,
        menuName: sanitizedData.name,
        menuType: sanitizedData.type
      },
      severity: 'low'
    })
  }

  // Execute with offline support
  return await withOfflineSupport(
    async () => {
      const { data, error } = await supabase
        .from('custom_menus')
        .insert(sanitizedData)
        .select()
        .single()

      if (error) {
        console.error('Error creating custom menu:', error)
        throw new Error('메뉴 생성에 실패했습니다')
      }

      // Log successful creation
      logSecurityEvent({
        userId: menuData.user_id,
        action: 'menu_created',
        details: {
          menuId: data.id,
          menuName: data.name,
          menuType: data.type
        },
        severity: 'low'
      })

      return data
    },
    {
      type: 'create',
      data: sanitizedData,
      userId: menuData.user_id
    }
  )
}

/**
 * Updates an existing custom menu with enhanced security validation
 * 요구사항 8.1, 8.2: 사용자당 메뉴 수 제한, 악성 콘텐츠 검증
 */
export async function updateCustomMenu(
  menuId: string, 
  updates: CustomMenuUpdate,
  userId: string
): Promise<CustomMenu | null> {
  // Rate limiting check
  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    const resetTime = new Date(rateLimit.resetTime).toLocaleTimeString()
    throw new Error(`요청 한도를 초과했습니다. ${resetTime}에 재시도하세요.`)
  }

  // Get current menu and existing names for validation
  const [currentMenuResult, existingNames] = await Promise.all([
    supabase.from('custom_menus').select('*').eq('id', menuId).eq('user_id', userId).single(),
    getUserMenuNames(userId)
  ])

  if (currentMenuResult.error || !currentMenuResult.data) {
    throw new Error('메뉴를 찾을 수 없습니다')
  }

  const currentMenu = currentMenuResult.data

  // If name is being updated, validate it
  if (updates.name) {
    // Remove current menu name from existing names for validation
    const otherNames = existingNames.filter(name => name !== currentMenu.name)
    
    const validation = validateMenuData({
      name: updates.name,
      type: updates.type || currentMenu.type,
      config: updates.config || currentMenu.config,
      userId,
      existingNames: otherNames
    })

    if (!validation.isValid) {
      logSecurityEvent({
        userId,
        action: 'menu_update_blocked',
        details: {
          menuId,
          errors: validation.errors,
          updates
        },
        severity: 'medium'
      })
      
      throw new Error(`메뉴 업데이트 실패: ${validation.errors.join(', ')}`)
    }

    // Use sanitized values
    updates.name = validation.sanitizedValue?.name || updates.name
    if (updates.config) {
      updates.config = validation.sanitizedValue?.config || updates.config
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logSecurityEvent({
        userId,
        action: 'menu_update_warnings',
        details: {
          menuId,
          warnings: validation.warnings,
          updates
        },
        severity: 'low'
      })
    }
  }

  // Execute with offline support
  return await withOfflineSupport(
    async () => {
      const { data, error } = await supabase
        .from('custom_menus')
        .update(updates)
        .eq('id', menuId)
        .eq('user_id', userId) // Ensure user can only update their own menus
        .select()
        .single()

      if (error) {
        console.error('Error updating custom menu:', error)
        throw new Error('메뉴 업데이트에 실패했습니다')
      }

      // Log successful update
      logSecurityEvent({
        userId,
        action: 'menu_updated',
        details: {
          menuId,
          updates,
          menuName: data.name
        },
        severity: 'low'
      })

      return data
    },
    {
      type: 'update',
      data: { menuId, updates, userId },
      userId
    }
  )
}

/**
 * Deletes a custom menu with proper archiving and impact notification
 * Includes network error handling and offline support
 * 요구사항 6.1, 6.2, 6.3, 6.4: 확인 대화상자, 완전 제거, 데이터 보관, 사용자 알림
 */
export async function deleteCustomMenu(menuId: string, userId: string): Promise<boolean> {
  try {
    // 메뉴 정보 가져오기
    const { data: menu, error: fetchError } = await supabase
      .from('custom_menus')
      .select('*')
      .eq('id', menuId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !menu) {
      throw new Error('메뉴를 찾을 수 없습니다')
    }

    // 삭제 영향 확인 (그룹 메뉴의 경우)
    const impact = await checkMenuDeletionImpact(menuId)
    
    // 그룹 메뉴이고 다른 사용자에게 영향을 주는 경우 알림
    if (menu.type === MenuType.GROUP && impact.hasMembers) {
      await notifyAffectedUsers(menu.name, impact.affectedUsers, userId)
    }

    // Execute with offline support
    const result = await withOfflineSupport(
      async () => {
        // 메뉴 삭제 (트리거가 자동으로 아카이브 처리)
        const { error: deleteError } = await supabase
          .from('custom_menus')
          .delete()
          .eq('id', menuId)
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Error deleting custom menu:', deleteError)
          throw new Error('메뉴 삭제에 실패했습니다')
        }

        return true
      },
      {
        type: 'delete',
        data: { menuId, userId, menuData: menu },
        userId
      }
    )

    return result !== null ? result : false
  } catch (error) {
    console.error('Error in deleteCustomMenu:', error)
    throw error
  }
}

/**
 * Gets all custom menus for a user with retry logic
 */
export async function getUserCustomMenus(userId: string): Promise<CustomMenu[]> {
  return await withRetry(async () => {
    const { data, error } = await supabase
      .from('custom_menus')
      .select('*')
      .eq('user_id', userId)
      .order('menu_order', { ascending: true })

    if (error) {
      console.error('Error fetching user custom menus:', error)
      throw error
    }

    return data || []
  })
}

/**
 * Reorders custom menus for a user with offline support
 */
export async function reorderCustomMenus(
  userId: string, 
  menuOrders: { id: string; order: number }[]
): Promise<boolean> {
  const result = await withOfflineSupport(
    async () => {
      // Update each menu's order
      const updates = menuOrders.map(({ id, order }) =>
        supabase
          .from('custom_menus')
          .update({ menu_order: order })
          .eq('id', id)
          .eq('user_id', userId)
      )

      await Promise.all(updates)
      return true
    },
    {
      type: 'reorder',
      data: { userId, menuOrders },
      userId
    }
  )

  return result !== null ? result : false
}

/**
 * Adds a member to a group menu
 */
export async function addMenuMember(memberData: MenuMemberInsert): Promise<MenuMember | null> {
  const { data, error } = await supabase
    .from('menu_members')
    .insert(memberData)
    .select()
    .single()

  if (error) {
    console.error('Error adding menu member:', error)
    throw new Error('멤버 추가에 실패했습니다')
  }

  return data
}

/**
 * Removes a member from a group menu
 */
export async function removeMenuMember(menuId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_members')
    .delete()
    .eq('menu_id', menuId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing menu member:', error)
    throw new Error('멤버 제거에 실패했습니다')
  }

  return true
}

/**
 * Gets all members of a group menu
 */
export async function getMenuMembers(menuId: string): Promise<MenuMember[]> {
  const { data, error } = await supabase
    .from('menu_members')
    .select('*')
    .eq('menu_id', menuId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching menu members:', error)
    return []
  }

  return data || []
}

/**
 * Processes offline menu actions when connection is restored
 * 요구사항 7.5: 네트워크 오류 복구
 */
export async function processOfflineMenuActions(userId: string): Promise<{ processed: number; failed: number }> {
  return await processOfflineActions(userId, {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('custom_menus')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return result
    },
    
    update: async ({ menuId, updates, userId: actionUserId }) => {
      const { data: result, error } = await supabase
        .from('custom_menus')
        .update(updates)
        .eq('id', menuId)
        .eq('user_id', actionUserId)
        .select()
        .single()
      
      if (error) throw error
      return result
    },
    
    delete: async ({ menuId, userId: actionUserId }) => {
      const { error } = await supabase
        .from('custom_menus')
        .delete()
        .eq('id', menuId)
        .eq('user_id', actionUserId)
      
      if (error) throw error
      return true
    },
    
    reorder: async ({ userId: actionUserId, menuOrders }) => {
      const updates = menuOrders.map(({ id, order }: { id: string; order: number }) =>
        supabase
          .from('custom_menus')
          .update({ menu_order: order })
          .eq('id', id)
          .eq('user_id', actionUserId)
      )
      
      await Promise.all(updates)
      return true
    }
  })
}

/**
 * Checks if there are pending offline actions for a user
 */
export function hasPendingOfflineActions(userId: string): boolean {
  return offlineActionQueue.hasActions(userId)
}