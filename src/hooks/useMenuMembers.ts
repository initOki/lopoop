import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { 
  getMenuMembers, 
  addMenuMember, 
  removeMenuMember 
} from '../lib/custom-menu-utils'
import type { 
  MenuMember, 
  MenuMemberInsert 
} from '../types/custom-menu'

interface UseMenuMembersReturn {
  members: MenuMember[]
  loading: boolean
  error: string | null
  addMember: (memberData: MenuMemberInsert) => Promise<MenuMember | null>
  removeMember: (userId: string) => Promise<boolean>
  refreshMembers: () => Promise<void>
}

/**
 * Hook for managing menu members with real-time updates
 */
export function useMenuMembers(menuId: string): UseMenuMembersReturn {
  const [members, setMembers] = useState<MenuMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial members
  const loadMembers = useCallback(async () => {
    if (!menuId) return

    try {
      setLoading(true)
      setError(null)
      const menuMembers = await getMenuMembers(menuId)
      setMembers(menuMembers)
    } catch (err) {
      console.error('Error loading menu members:', err)
      setError('멤버 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [menuId])

  // Set up real-time subscription
  useEffect(() => {
    if (!menuId) return

    // Load initial data
    loadMembers()

    // Set up real-time subscription
    const channel = supabase
      .channel('menu_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_members',
          filter: `menu_id=eq.${menuId}`
        },
        (payload: any) => {
          console.log('Menu member change detected:', payload)
          
          switch (payload.eventType) {
            case 'INSERT':
              setMembers((prev: MenuMember[]) => {
                const newMember = payload.new as MenuMember
                // Check if member already exists to avoid duplicates
                if (prev.find((member: MenuMember) => member.id === newMember.id)) {
                  return prev
                }
                return [...prev, newMember].sort((a: MenuMember, b: MenuMember) => 
                  new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
                )
              })
              break
              
            case 'UPDATE':
              setMembers((prev: MenuMember[]) => 
                prev.map((member: MenuMember) => 
                  member.id === payload.new.id 
                    ? { ...member, ...payload.new } as MenuMember
                    : member
                )
              )
              break
              
            case 'DELETE':
              setMembers((prev: MenuMember[]) => 
                prev.filter((member: MenuMember) => member.id !== payload.old.id)
              )
              break
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [menuId, loadMembers])

  // Add a new member
  const addMember = useCallback(async (memberData: MenuMemberInsert): Promise<MenuMember | null> => {
    try {
      setError(null)
      const newMember = await addMenuMember(memberData)
      // Real-time subscription will handle state update
      return newMember
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '멤버 추가에 실패했습니다'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Remove a member
  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await removeMenuMember(menuId, userId)
      // Real-time subscription will handle state update
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '멤버 제거에 실패했습니다'
      setError(errorMessage)
      throw err
    }
  }, [menuId])

  // Refresh members manually
  const refreshMembers = useCallback(async () => {
    await loadMembers()
  }, [loadMembers])

  return {
    members,
    loading,
    error,
    addMember,
    removeMember,
    refreshMembers
  }
}