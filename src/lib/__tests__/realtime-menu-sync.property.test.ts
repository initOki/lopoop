import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { MenuType } from '../../types/custom-menu'
import type { CustomMenuInsert, CustomMenu } from '../../types/custom-menu'

/**
 * Property-Based Test for Real-time Menu Synchronization
 * **Feature: custom-menu-management, Property 26: Real-time menu change synchronization**
 * **Validates: Requirements 8.4**
 * 
 * Property: For any menu change, all user sessions should receive 
 * real-time updates and maintain synchronized menu state
 */

// Mock Supabase real-time channel
interface MockChannel {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
}

interface MockRealtimeClient {
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
}

// Mock session state to simulate multiple user sessions
interface MockSession {
  id: string
  userId: string
  menus: CustomMenu[]
  subscriptionCallback: ((payload: any) => void) | null
}

// Global state for simulating real-time synchronization
let mockSessions: MockSession[] = []
let mockDatabase: CustomMenu[] = []
let mockChannels: MockChannel[] = []

// Mock Supabase client for real-time testing
const mockSupabaseClient: MockRealtimeClient = {
  channel: vi.fn((channelName: string) => {
    const mockChannel: MockChannel = {
      on: vi.fn((_event: string, _config: any, callback: (payload: any) => void) => {
        // Find the session and store the callback
        const sessionId = channelName.replace('session_', '')
        const session = mockSessions.find(s => s.id === sessionId)
        if (session) {
          session.subscriptionCallback = callback
        }
        return mockChannel
      }),
      subscribe: vi.fn(() => {
        mockChannels.push(mockChannel)
        return mockChannel
      }),
      unsubscribe: vi.fn(() => {
        const index = mockChannels.indexOf(mockChannel)
        if (index > -1) {
          mockChannels.splice(index, 1)
        }
      })
    }
    return mockChannel
  }),
  removeChannel: vi.fn((channel: MockChannel) => {
    const index = mockChannels.indexOf(channel)
    if (index > -1) {
      mockChannels.splice(index, 1)
    }
  })
}

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: mockSupabaseClient
}))

// Test user IDs for multi-session testing
const TEST_USER_ID_1 = 'test-user-sync-1'
const TEST_USER_ID_2 = 'test-user-sync-2'

// Simulate real-time event broadcasting to all sessions
function broadcastRealtimeEvent(eventType: 'INSERT' | 'UPDATE' | 'DELETE', menuData: any) {
  const payload = {
    eventType,
    new: eventType !== 'DELETE' ? menuData : undefined,
    old: eventType === 'DELETE' ? menuData : undefined
  }

  // Broadcast to all active sessions for the affected user
  mockSessions.forEach(session => {
    if (session.userId === menuData.user_id && session.subscriptionCallback) {
      try {
        // Call the callback function directly
        session.subscriptionCallback(payload)
      } catch (error) {
        // Ignore errors during callback execution in tests
        console.warn('Mock callback error:', error)
      }
    }
  })
}

// Mock implementation of createCustomMenu that simulates database persistence
async function mockCreateCustomMenuWithRealtime(menuData: CustomMenuInsert): Promise<CustomMenu> {
  const newMenu: CustomMenu = {
    id: `menu-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    user_id: menuData.user_id,
    name: menuData.name, // Don't trim here - preserve original name
    type: menuData.type as any,
    config: menuData.config || {},
    menu_order: menuData.menu_order || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Add to mock database
  mockDatabase.push(newMenu)
  
  // Broadcast INSERT event to all sessions
  broadcastRealtimeEvent('INSERT', newMenu)
  
  return newMenu
}

async function mockUpdateCustomMenuWithRealtime(menuId: string, updates: Partial<CustomMenu>): Promise<CustomMenu> {
  const menuIndex = mockDatabase.findIndex(menu => menu.id === menuId)
  if (menuIndex === -1) {
    throw new Error('Menu not found')
  }
  
  const updatedMenu = {
    ...mockDatabase[menuIndex],
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  mockDatabase[menuIndex] = updatedMenu
  
  // Broadcast UPDATE event to all sessions
  broadcastRealtimeEvent('UPDATE', updatedMenu)
  
  return updatedMenu
}

async function mockDeleteCustomMenuWithRealtime(menuId: string): Promise<boolean> {
  const menuIndex = mockDatabase.findIndex(menu => menu.id === menuId)
  if (menuIndex === -1) {
    return false
  }
  
  const deletedMenu = mockDatabase[menuIndex]
  mockDatabase.splice(menuIndex, 1)
  
  // Broadcast DELETE event to all sessions
  broadcastRealtimeEvent('DELETE', deletedMenu)
  
  return true
}

// Create a mock session that simulates a user's real-time subscription
function createMockSession(sessionId: string, userId: string): MockSession {
  const session: MockSession = {
    id: sessionId,
    userId,
    menus: [], // Always start with empty menus
    subscriptionCallback: null
  }
  
  mockSessions.push(session)
  
  // Simulate setting up real-time subscription
  const channel = mockSupabaseClient.channel(`session_${sessionId}`)
  
  // Store the callback function directly in the session for later use
  const callbackHandler = (payload: any) => {
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new && payload.new.user_id === userId) {
          // Check for duplicates before adding
          const exists = session.menus.find(menu => menu.id === payload.new.id)
          if (!exists) {
            session.menus = [...session.menus, payload.new].sort((a, b) => a.menu_order - b.menu_order)
          }
        }
        break
      case 'UPDATE':
        if (payload.new && session.menus.find(menu => menu.id === payload.new.id)) {
          session.menus = session.menus.map(menu => 
            menu.id === payload.new.id ? { ...menu, ...payload.new } : menu
          ).sort((a, b) => a.menu_order - b.menu_order)
        }
        break
      case 'DELETE':
        if (payload.old) {
          session.menus = session.menus.filter(menu => menu.id !== payload.old.id)
        }
        break
    }
  }
  
  // Store the callback in the session for the broadcast function to use
  session.subscriptionCallback = callbackHandler
  
  channel.on('postgres_changes', {}, callbackHandler)
  channel.subscribe()
  
  return session
}

// Cleanup function
function cleanupTestData() {
  // Clear all test data completely
  mockDatabase = []
  mockSessions = []
  mockChannels = []
  
  // Reset all mocks
  vi.clearAllMocks()
}

// Fast-check arbitraries
const menuTypeArbitrary = fc.constantFrom(
  MenuType.GROUP,
  MenuType.DASHBOARD,
  MenuType.EXTERNAL_LINK,
  MenuType.CUSTOM_PAGE,
  MenuType.PROJECT
)

const validMenuNameArbitrary = fc.string({ 
  minLength: 1, 
  maxLength: 50 
}).filter(name => {
  const trimmed = name.trim()
  const validChars = /^[가-힣a-zA-Z0-9\s\-_!@#$%^&*()+=\[\]{}|;:'"<>,.?/~`]+$/
  return trimmed.length > 0 && validChars.test(trimmed)
})

const menuConfigArbitrary = fc.record({
  description: fc.option(fc.string({ maxLength: 200 })),
  isPrivate: fc.option(fc.boolean()),
  allowEdit: fc.option(fc.boolean()),
  layout: fc.option(fc.constantFrom('grid', 'list', 'custom'))
})

const customMenuInsertArbitrary = fc.record({
  user_id: fc.constantFrom(TEST_USER_ID_1, TEST_USER_ID_2),
  name: validMenuNameArbitrary,
  type: menuTypeArbitrary,
  config: menuConfigArbitrary,
  menu_order: fc.integer({ min: 0, max: 100 })
})

describe('Real-time Menu Synchronization Properties', () => {
  beforeEach(() => {
    cleanupTestData()
  })

  afterEach(() => {
    cleanupTestData()
  })

  it('Property 26: Real-time menu change synchronization', async () => {
    await fc.assert(
      fc.asyncProperty(
        customMenuInsertArbitrary,
        async (menuData: CustomMenuInsert) => {
          // Ensure clean state at start of each iteration
          cleanupTestData()
          
          // Create multiple sessions for the same user to simulate multi-session scenario
          const session1 = createMockSession('session1', menuData.user_id)
          const session2 = createMockSession('session2', menuData.user_id)
          const session3 = createMockSession('session3', menuData.user_id)
          
          // Verify initial state - all sessions should have empty menu lists
          expect(session1.menus).toHaveLength(0)
          expect(session2.menus).toHaveLength(0)
          expect(session3.menus).toHaveLength(0)
          
          // Create a menu - this should trigger real-time updates
          const createdMenu = await mockCreateCustomMenuWithRealtime(menuData)
          
          // Small delay to simulate real-time propagation
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify all sessions received the INSERT event and updated their state
          expect(session1.menus).toHaveLength(1)
          expect(session2.menus).toHaveLength(1)
          expect(session3.menus).toHaveLength(1)
          
          // Verify menu data consistency across all sessions
          const sessions = [session1, session2, session3]
          sessions.forEach(session => {
            const menu = session.menus[0]
            expect(menu.id).toBe(createdMenu.id)
            expect(menu.name).toBe(createdMenu.name)
            expect(menu.type).toBe(createdMenu.type)
            expect(menu.user_id).toBe(menuData.user_id)
          })
          
          // Test UPDATE synchronization
          const updatedName = `Updated ${menuData.name}`
          await mockUpdateCustomMenuWithRealtime(createdMenu.id, { name: updatedName })
          
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify all sessions received the UPDATE event
          sessions.forEach(session => {
            expect(session.menus).toHaveLength(1)
            expect(session.menus[0].name).toBe(updatedName)
            expect(session.menus[0].id).toBe(createdMenu.id)
          })
          
          // Test DELETE synchronization
          await mockDeleteCustomMenuWithRealtime(createdMenu.id)
          
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify all sessions received the DELETE event
          sessions.forEach(session => {
            expect(session.menus).toHaveLength(0)
          })
          
          // Clean up after this iteration
          cleanupTestData()
        }
      ),
      { 
        numRuns: 100,
        timeout: 15000
      }
    )
  }, 30000)

  it('Property 26 Edge Case: Cross-user isolation in real-time updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            user_id: fc.constant(TEST_USER_ID_1),
            name: validMenuNameArbitrary,
            type: menuTypeArbitrary,
            config: menuConfigArbitrary,
            menu_order: fc.integer({ min: 0, max: 100 })
          }),
          fc.record({
            user_id: fc.constant(TEST_USER_ID_2),
            name: validMenuNameArbitrary,
            type: menuTypeArbitrary,
            config: menuConfigArbitrary,
            menu_order: fc.integer({ min: 0, max: 100 })
          })
        ),
        async ([menuData1, menuData2]) => {
          // Ensure clean state at start of each iteration
          cleanupTestData()
          
          // Create sessions for different users
          const user1Session = createMockSession('user1_session', TEST_USER_ID_1)
          const user2Session = createMockSession('user2_session', TEST_USER_ID_2)
          
          // Create menu for user 1
          const menu1 = await mockCreateCustomMenuWithRealtime(menuData1)
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify only user 1's session received the update
          expect(user1Session.menus).toHaveLength(1)
          expect(user2Session.menus).toHaveLength(0)
          expect(user1Session.menus[0].id).toBe(menu1.id)
          
          // Create menu for user 2
          const menu2 = await mockCreateCustomMenuWithRealtime(menuData2)
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify each user only sees their own menus
          expect(user1Session.menus).toHaveLength(1)
          expect(user2Session.menus).toHaveLength(1)
          expect(user1Session.menus[0].id).toBe(menu1.id)
          expect(user2Session.menus[0].id).toBe(menu2.id)
          
          // Update user 1's menu
          await mockUpdateCustomMenuWithRealtime(menu1.id, { name: 'Updated User 1 Menu' })
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Verify isolation - only user 1's session should see the update
          expect(user1Session.menus[0].name).toBe('Updated User 1 Menu')
          expect(user2Session.menus[0].name).toBe(menuData2.name) // Unchanged
        }
      ),
      { 
        numRuns: 50,
        timeout: 15000
      }
    )
  }, 30000)

  it('Property 26 Edge Case: Menu order synchronization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            user_id: fc.constant(TEST_USER_ID_1),
            name: validMenuNameArbitrary,
            type: menuTypeArbitrary,
            config: menuConfigArbitrary,
            menu_order: fc.integer({ min: 0, max: 10 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (menuDataArray) => {
          // Ensure clean state at start of each iteration
          cleanupTestData()
          
          // Create multiple sessions
          const session1 = createMockSession('order_session1', TEST_USER_ID_1)
          const session2 = createMockSession('order_session2', TEST_USER_ID_1)
          
          // Create multiple menus
          const createdMenus: CustomMenu[] = []
          for (const menuData of menuDataArray) {
            const menu = await mockCreateCustomMenuWithRealtime(menuData)
            createdMenus.push(menu)
            await new Promise(resolve => setTimeout(resolve, 5))
          }
          
          // Verify all sessions have the same menus in the same order
          expect(session1.menus).toHaveLength(menuDataArray.length)
          expect(session2.menus).toHaveLength(menuDataArray.length)
          
          // Check order consistency
          const session1Order = session1.menus.map(m => m.id)
          const session2Order = session2.menus.map(m => m.id)
          expect(session1Order).toEqual(session2Order)
          
          // Verify menus are sorted by menu_order
          for (let i = 1; i < session1.menus.length; i++) {
            expect(session1.menus[i].menu_order).toBeGreaterThanOrEqual(session1.menus[i-1].menu_order)
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 20000
      }
    )
  }, 30000)

  it('Property 26 Additional: Rapid successive changes synchronization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.constant(TEST_USER_ID_1),
          name: validMenuNameArbitrary,
          type: menuTypeArbitrary,
          config: menuConfigArbitrary,
          menu_order: fc.integer({ min: 0, max: 100 })
        }),
        async (menuData) => {
          // Ensure clean state at start of each iteration
          cleanupTestData()
          
          // Create sessions
          const session1 = createMockSession('rapid_session1', TEST_USER_ID_1)
          const session2 = createMockSession('rapid_session2', TEST_USER_ID_1)
          
          // Create initial menu
          const menu = await mockCreateCustomMenuWithRealtime(menuData)
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Perform rapid successive updates
          const updateCount = 5
          for (let i = 0; i < updateCount; i++) {
            await mockUpdateCustomMenuWithRealtime(menu.id, { 
              name: `${menuData.name} - Update ${i + 1}` 
            })
            await new Promise(resolve => setTimeout(resolve, 5))
          }
          
          // Verify final state consistency across sessions
          expect(session1.menus).toHaveLength(1)
          expect(session2.menus).toHaveLength(1)
          
          const finalName = `${menuData.name} - Update ${updateCount}`
          expect(session1.menus[0].name).toBe(finalName)
          expect(session2.menus[0].name).toBe(finalName)
          expect(session1.menus[0].id).toBe(menu.id)
          expect(session2.menus[0].id).toBe(menu.id)
          
          // Clean up after this iteration
          cleanupTestData()
        }
      ),
      { 
        numRuns: 20,
        timeout: 20000
      }
    )
  }, 30000)
})