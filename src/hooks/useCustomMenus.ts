import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getUserCustomMenus,
  createCustomMenu,
  updateCustomMenu,
  deleteCustomMenu,
  reorderCustomMenus,
  processOfflineMenuActions,
  hasPendingOfflineActions,
} from '../lib/custom-menu-utils'
import { useNetworkState } from '../lib/network-error-handler'
import type {
  CustomMenu,
  CustomMenuInsert,
  CustomMenuUpdate,
} from '../types/custom-menu'

interface UseCustomMenusReturn {
  menus: CustomMenu[]
  loading: boolean
  error: string | null
  isOnline: boolean
  isConnected: boolean
  hasPendingActions: boolean
  createMenu: (menuData: CustomMenuInsert) => Promise<CustomMenu | null>
  updateMenu: (
    menuId: string,
    updates: CustomMenuUpdate,
  ) => Promise<CustomMenu | null>
  deleteMenu: (menuId: string) => Promise<boolean>
  reorderMenus: (
    menuOrders: { id: string; order: number }[],
  ) => Promise<boolean>
  refreshMenus: () => Promise<void>
  syncOfflineActions: () => Promise<{ processed: number; failed: number }>
}

/**
 * Hook for managing custom menus with real-time updates, network error handling, and offline support
 * 요구사항 7.5: 네트워크 오류 처리 및 복구
 */
export function useCustomMenus(userId: string): UseCustomMenusReturn {
  const [menus, setMenus] = useState<CustomMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPendingActions, setHasPendingActions] = useState(false)

  // Monitor network state
  const networkState = useNetworkState()

  // Check for pending offline actions
  const checkPendingActions = useCallback(() => {
    const pending = hasPendingOfflineActions(userId)
    setHasPendingActions(pending)
  }, [userId])

  // Load initial menus
  const loadMenus = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const userMenus = await getUserCustomMenus(userId)
      setMenus(userMenus)
    } catch (err) {
      console.error('Error loading custom menus:', err)
      setError('메뉴를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Process offline actions when connection is restored
  const syncOfflineActions = useCallback(async () => {
    if (!networkState.isConnected || !hasPendingActions) {
      return { processed: 0, failed: 0 }
    }

    try {
      const result = await processOfflineMenuActions(userId)
      checkPendingActions()

      // Refresh menus after processing offline actions
      if (result.processed > 0) {
        await loadMenus()
      }

      return result
    } catch (error) {
      console.error('Error processing offline actions:', error)
      return { processed: 0, failed: 0 }
    }
  }, [
    userId,
    networkState.isConnected,
    hasPendingActions,
    loadMenus,
    checkPendingActions,
  ])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    // Load initial data
    loadMenus()
    checkPendingActions()

    // Set up real-time subscription
    const channel = supabase
      .channel('custom_menus_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_menus',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('Custom menu change detected:', payload)

          switch (payload.eventType) {
            case 'INSERT':
              setMenus((prev: CustomMenu[]) => {
                const newMenu = payload.new as CustomMenu
                // Check if menu already exists to avoid duplicates
                if (prev.find((menu: CustomMenu) => menu.id === newMenu.id)) {
                  return prev
                }
                return [...prev, newMenu].sort(
                  (a: CustomMenu, b: CustomMenu) => a.menu_order - b.menu_order,
                )
              })
              break

            case 'UPDATE':
              setMenus((prev: CustomMenu[]) =>
                prev
                  .map((menu: CustomMenu) =>
                    menu.id === payload.new.id
                      ? ({ ...menu, ...payload.new } as CustomMenu)
                      : menu,
                  )
                  .sort(
                    (a: CustomMenu, b: CustomMenu) =>
                      a.menu_order - b.menu_order,
                  ),
              )
              break

            case 'DELETE':
              setMenus((prev: CustomMenu[]) =>
                prev.filter((menu: CustomMenu) => menu.id !== payload.old.id),
              )
              break
          }
        },
      )
      .subscribe((status) => {
        console.log('Custom menus subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log(
            'Successfully subscribed to custom menus realtime updates',
          )
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to custom menus realtime updates')
        } else if (status === 'CLOSED') {
          console.warn('Custom menus realtime connection closed')
        }
      })

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadMenus, checkPendingActions])

  // Auto-sync offline actions when connection is restored
  useEffect(() => {
    if (networkState.isConnected && hasPendingActions) {
      console.log('Connection restored, syncing offline actions...')
      syncOfflineActions()
    }
  }, [networkState.isConnected, hasPendingActions, syncOfflineActions])

  // Create a new menu
  const createMenu = useCallback(
    async (menuData: CustomMenuInsert): Promise<CustomMenu | null> => {
      try {
        setError(null)
        const newMenu = await createCustomMenu(menuData)
        checkPendingActions()
        // Real-time subscription will handle state update if online
        return newMenu
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '메뉴 생성에 실패했습니다'
        setError(errorMessage)
        checkPendingActions()
        throw err
      }
    },
    [checkPendingActions],
  )

  // Update an existing menu
  const updateMenu = useCallback(
    async (
      menuId: string,
      updates: CustomMenuUpdate,
    ): Promise<CustomMenu | null> => {
      try {
        setError(null)
        const updatedMenu = await updateCustomMenu(menuId, updates, userId)
        checkPendingActions()
        // Real-time subscription will handle state update if online
        return updatedMenu
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '메뉴 업데이트에 실패했습니다'
        setError(errorMessage)
        checkPendingActions()
        throw err
      }
    },
    [userId, checkPendingActions],
  )

  // Delete a menu
  const deleteMenu = useCallback(
    async (menuId: string): Promise<boolean> => {
      try {
        setError(null)
        const success = await deleteCustomMenu(menuId, userId)
        checkPendingActions()
        // Real-time subscription will handle state update if online
        return success
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '메뉴 삭제에 실패했습니다'
        setError(errorMessage)
        checkPendingActions()
        throw err
      }
    },
    [userId, checkPendingActions],
  )

  // Reorder menus
  const reorderMenus = useCallback(
    async (menuOrders: { id: string; order: number }[]): Promise<boolean> => {
      try {
        setError(null)
        const success = await reorderCustomMenus(userId, menuOrders)

        if (success || !networkState.isConnected) {
          // Optimistically update local state for immediate feedback
          setMenus((prev: CustomMenu[]) => {
            const updated = prev.map((menu: CustomMenu) => {
              const newOrder = menuOrders.find((order) => order.id === menu.id)
              return newOrder ? { ...menu, menu_order: newOrder.order } : menu
            })
            return updated.sort(
              (a: CustomMenu, b: CustomMenu) => a.menu_order - b.menu_order,
            )
          })
        }

        checkPendingActions()
        return success
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '메뉴 순서 변경에 실패했습니다'
        setError(errorMessage)
        checkPendingActions()
        return false
      }
    },
    [userId, networkState.isConnected, checkPendingActions],
  )

  // Refresh menus manually
  const refreshMenus = useCallback(async () => {
    await loadMenus()
  }, [loadMenus])

  return {
    menus,
    loading,
    error,
    isOnline: networkState.isOnline,
    isConnected: networkState.isConnected,
    hasPendingActions,
    createMenu,
    updateMenu,
    deleteMenu,
    reorderMenus,
    refreshMenus,
    syncOfflineActions,
  }
}
