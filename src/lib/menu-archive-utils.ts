import { supabase } from './supabase'

export interface ArchivedMenu {
  id: string
  original_menu_id: string
  user_id: string
  name: string
  type: string
  config: any
  menu_order: number
  original_created_at: string
  original_updated_at: string
  deleted_at: string
  recovery_expires_at: string
  deleted_by: string
}

export interface ArchivedMenuMember {
  id: string
  archived_menu_id: string
  original_member_id: string
  menu_id: string
  user_id: string
  role: string
  joined_at: string
  archived_at: string
}

/**
 * 사용자의 아카이브된 메뉴 목록을 가져옵니다
 */
export async function getUserArchivedMenus(userId: string): Promise<ArchivedMenu[]> {
  // For now, return empty array since archived tables are not in the main schema
  // In a real implementation, this would use the RPC function
  console.log('getUserArchivedMenus called for user:', userId)
  return []
}

/**
 * 아카이브된 메뉴를 복구합니다
 */
export async function restoreArchivedMenu(archivedMenuId: string): Promise<string | null> {
  // For now, return null since archived tables are not in the main schema
  // In a real implementation, this would use the RPC function
  console.log('restoreArchivedMenu called for menu:', archivedMenuId)
  throw new Error('메뉴 복구 기능은 데이터베이스 마이그레이션 후 사용 가능합니다')
}

/**
 * 만료된 아카이브 메뉴를 정리합니다 (관리자 기능)
 */
export async function cleanupExpiredArchivedMenus(): Promise<number> {
  // For now, return 0 since archived tables are not in the main schema
  // In a real implementation, this would use the RPC function
  console.log('cleanupExpiredArchivedMenus called')
  return 0
}

/**
 * 아카이브된 메뉴의 멤버 목록을 가져옵니다
 */
export async function getArchivedMenuMembers(archivedMenuId: string): Promise<ArchivedMenuMember[]> {
  // For now, return empty array since archived tables are not in the main schema
  // In a real implementation, this would use the RPC function
  console.log('getArchivedMenuMembers called for menu:', archivedMenuId)
  return []
}

/**
 * 아카이브된 메뉴가 복구 가능한지 확인합니다
 */
export function isMenuRecoverable(archivedMenu: ArchivedMenu): boolean {
  const now = new Date()
  const expiryDate = new Date(archivedMenu.recovery_expires_at)
  return now < expiryDate
}

/**
 * 복구 만료까지 남은 시간을 계산합니다
 */
export function getTimeUntilExpiry(archivedMenu: ArchivedMenu): {
  days: number
  hours: number
  minutes: number
  expired: boolean
} {
  const now = new Date()
  const expiryDate = new Date(archivedMenu.recovery_expires_at)
  const diffMs = expiryDate.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, expired: false }
}

/**
 * 메뉴 삭제가 다른 사용자에게 영향을 주는지 확인합니다
 */
export async function checkMenuDeletionImpact(menuId: string): Promise<{
  affectedUsers: string[]
  hasMembers: boolean
  memberCount: number
}> {
  const { data: members, error } = await supabase
    .from('menu_members')
    .select('user_id')
    .eq('menu_id', menuId)

  if (error) {
    console.error('Error checking menu deletion impact:', error)
    return { affectedUsers: [], hasMembers: false, memberCount: 0 }
  }

  const affectedUsers = members?.map(member => member.user_id) || []
  
  return {
    affectedUsers,
    hasMembers: affectedUsers.length > 0,
    memberCount: affectedUsers.length
  }
}

/**
 * 그룹 메뉴 삭제 시 영향받는 사용자들에게 알림을 보냅니다
 * (실제 구현에서는 알림 시스템과 연동)
 */
export async function notifyAffectedUsers(
  menuName: string,
  affectedUsers: string[],
  deletedBy: string
): Promise<void> {
  // TODO: 실제 알림 시스템과 연동
  console.log(`메뉴 "${menuName}"이 ${deletedBy}에 의해 삭제되었습니다.`)
  console.log(`영향받는 사용자: ${affectedUsers.join(', ')}`)
  
  // 여기서 실제 알림 로직을 구현할 수 있습니다:
  // - 이메일 발송
  // - 인앱 알림
  // - 푸시 알림 등
}