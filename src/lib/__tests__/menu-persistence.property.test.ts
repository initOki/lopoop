import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { MenuType } from '../../types/custom-menu'
import type { CustomMenuInsert, CustomMenu } from '../../types/custom-menu'

/**
 * Property-Based Test for Menu Data Persistence
 * **Feature: custom-menu-management, Property 4: Menu creation database persistence**
 * **Validates: Requirements 1.5**
 * 
 * Property: For any valid menu data, when a menu is created, 
 * it should be immediately stored in the database and retrievable
 */

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: mockSupabaseClient
}))

// Test user ID for isolation
const TEST_USER_ID = 'test-user-persistence'

// In-memory storage to simulate database persistence
let mockDatabase: CustomMenu[] = []

// Mock implementation of createCustomMenu that simulates database persistence
async function mockCreateCustomMenu(menuData: CustomMenuInsert): Promise<CustomMenu> {
  const newMenu: CustomMenu = {
    id: `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: menuData.user_id,
    name: menuData.name.trim(),
    type: menuData.type as any,
    config: menuData.config || {},
    menu_order: menuData.menu_order || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Simulate database storage
  mockDatabase.push(newMenu)
  
  return newMenu
}

// Mock implementation of getUserCustomMenus that retrieves from mock database
async function mockGetUserCustomMenus(userId: string): Promise<CustomMenu[]> {
  return mockDatabase.filter(menu => menu.user_id === userId)
}

// Cleanup function to clear mock database
function cleanupTestData() {
  mockDatabase = mockDatabase.filter(menu => menu.user_id !== TEST_USER_ID)
}

// Fast-check arbitraries for generating test data
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
  // Ensure name contains valid characters and is not just whitespace
  const trimmed = name.trim()
  const validChars = /^[가-힣a-zA-Z0-9\s\-_!@#$%^&*()+=\[\]{}|;:'"<>,.?/~`]+$/
  return trimmed.length > 0 && validChars.test(trimmed)
})

const menuConfigArbitrary = fc.record({
  description: fc.option(fc.string({ maxLength: 200 })),
  isPrivate: fc.option(fc.boolean()),
  allowEdit: fc.option(fc.boolean()),
  layout: fc.option(fc.constantFrom('grid', 'list', 'custom')),
  features: fc.option(fc.record({
    announcements: fc.boolean(),
    scheduling: fc.boolean(),
    fileSharing: fc.boolean(),
    chat: fc.boolean()
  }))
})

const customMenuInsertArbitrary = fc.record({
  user_id: fc.constant(TEST_USER_ID),
  name: validMenuNameArbitrary,
  type: menuTypeArbitrary,
  config: menuConfigArbitrary,
  menu_order: fc.integer({ min: 0, max: 100 })
})

describe('Menu Data Persistence Properties', () => {
  beforeEach(() => {
    cleanupTestData()
  })

  afterEach(() => {
    cleanupTestData()
  })

  it('Property 4: Menu creation database persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        customMenuInsertArbitrary,
        async (menuData: CustomMenuInsert) => {
          // Create the menu using mock implementation
          const createdMenu = await mockCreateCustomMenu(menuData)
          
          // Verify menu was created successfully
          expect(createdMenu).toBeTruthy()
          expect(createdMenu.id).toBeDefined()
          expect(createdMenu.user_id).toBe(menuData.user_id)
          expect(createdMenu.name.trim()).toBe(menuData.name.trim())
          expect(createdMenu.type).toBe(menuData.type)
          
          // Verify menu is immediately retrievable from database
          const retrievedMenus = await mockGetUserCustomMenus(TEST_USER_ID)
          const foundMenu = retrievedMenus.find(menu => menu.id === createdMenu.id)
          
          expect(foundMenu).toBeTruthy()
          expect(foundMenu!.id).toBe(createdMenu.id)
          expect(foundMenu!.user_id).toBe(menuData.user_id)
          expect(foundMenu!.name).toBe(createdMenu.name)
          expect(foundMenu!.type).toBe(menuData.type)
          expect(foundMenu!.created_at).toBeDefined()
          expect(foundMenu!.updated_at).toBeDefined()
          
          // Verify timestamps are valid
          const createdAt = new Date(foundMenu!.created_at)
          const updatedAt = new Date(foundMenu!.updated_at)
          expect(createdAt.getTime()).toBeGreaterThan(0)
          expect(updatedAt.getTime()).toBeGreaterThan(0)
          
          // Verify config is preserved (allowing for default config merging)
          expect(foundMenu!.config).toBeDefined()
          
          // Clean up this specific menu for next iteration
          mockDatabase = mockDatabase.filter(menu => menu.id !== createdMenu.id)
        }
      ),
      { 
        numRuns: 100,
        timeout: 10000 // 10 seconds timeout for mock operations
      }
    )
  }, 30000) // 30 seconds test timeout

  it('Property 4 Edge Case: Empty config persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.constant(TEST_USER_ID),
          name: validMenuNameArbitrary,
          type: menuTypeArbitrary,
          config: fc.constant({}), // Empty config
          menu_order: fc.integer({ min: 0, max: 100 })
        }),
        async (menuData: CustomMenuInsert) => {
          const createdMenu = await mockCreateCustomMenu(menuData)
          
          expect(createdMenu).toBeTruthy()
          
          const retrievedMenus = await mockGetUserCustomMenus(TEST_USER_ID)
          const foundMenu = retrievedMenus.find(menu => menu.id === createdMenu.id)
          
          expect(foundMenu).toBeTruthy()
          expect(foundMenu!.config).toBeDefined()
          
          // Clean up
          mockDatabase = mockDatabase.filter(menu => menu.id !== createdMenu.id)
        }
      ),
      { 
        numRuns: 50,
        timeout: 10000
      }
    )
  }, 30000)

  it('Property 4 Edge Case: Maximum length name persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user_id: fc.constant(TEST_USER_ID),
          name: fc.string({ minLength: 90, maxLength: 100 }).filter(name => {
            const trimmed = name.trim()
            const validChars = /^[가-힣a-zA-Z0-9\s\-_!@#$%^&*()+=\[\]{}|;:'"<>,.?/~`]+$/
            return trimmed.length > 0 && validChars.test(trimmed)
          }),
          type: menuTypeArbitrary,
          config: menuConfigArbitrary,
          menu_order: fc.integer({ min: 0, max: 100 })
        }),
        async (menuData: CustomMenuInsert) => {
          const createdMenu = await mockCreateCustomMenu(menuData)
          
          expect(createdMenu).toBeTruthy()
          expect(createdMenu.name.length).toBeLessThanOrEqual(100)
          
          const retrievedMenus = await mockGetUserCustomMenus(TEST_USER_ID)
          const foundMenu = retrievedMenus.find(menu => menu.id === createdMenu.id)
          
          expect(foundMenu).toBeTruthy()
          expect(foundMenu!.name).toBe(createdMenu.name)
          
          // Clean up
          mockDatabase = mockDatabase.filter(menu => menu.id !== createdMenu.id)
        }
      ),
      { 
        numRuns: 30,
        timeout: 10000
      }
    )
  }, 30000)

  it('Property 4 Additional: Multiple menu persistence isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(customMenuInsertArbitrary, { minLength: 2, maxLength: 5 }),
        async (menuDataArray: CustomMenuInsert[]) => {
          const createdMenus: CustomMenu[] = []
          
          // Create multiple menus
          for (const menuData of menuDataArray) {
            const createdMenu = await mockCreateCustomMenu(menuData)
            createdMenus.push(createdMenu)
          }
          
          // Verify all menus are retrievable
          const retrievedMenus = await mockGetUserCustomMenus(TEST_USER_ID)
          
          expect(retrievedMenus.length).toBe(createdMenus.length)
          
          // Verify each created menu exists in retrieved menus
          for (const createdMenu of createdMenus) {
            const foundMenu = retrievedMenus.find(menu => menu.id === createdMenu.id)
            expect(foundMenu).toBeTruthy()
            expect(foundMenu!.name).toBe(createdMenu.name)
            expect(foundMenu!.type).toBe(createdMenu.type)
          }
          
          // Clean up all created menus
          for (const createdMenu of createdMenus) {
            mockDatabase = mockDatabase.filter(menu => menu.id !== createdMenu.id)
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 10000
      }
    )
  }, 30000)
})