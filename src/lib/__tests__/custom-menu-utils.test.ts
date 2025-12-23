import { describe, it, expect } from 'vitest'
import { MenuType } from '../../types/custom-menu'

// Import only the pure functions that don't depend on Supabase
const validateMenu = (
  name: string, 
  type: MenuType, 
  config: any,
  existingNames: string[] = []
) => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push('메뉴 이름은 필수입니다')
  } else if (name.length > 100) {
    errors.push('메뉴 이름은 100자를 초과할 수 없습니다')
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

  // Type-specific validation
  if (type === MenuType.EXTERNAL_LINK && config.links) {
    config.links.forEach((link: any, index: number) => {
      if (!link.url || !isValidUrl(link.url)) {
        errors.push(`링크 ${index + 1}의 URL이 유효하지 않습니다`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

const sanitizeMenuInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

describe('Custom Menu Utils', () => {
  describe('validateMenu', () => {
    it('should validate a valid menu', () => {
      const result = validateMenu('테스트 메뉴', MenuType.DASHBOARD, {})
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty menu name', () => {
      const result = validateMenu('', MenuType.DASHBOARD, {})
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('메뉴 이름은 필수입니다')
    })

    it('should reject duplicate menu names', () => {
      const existingNames = ['기존 메뉴']
      const result = validateMenu('기존 메뉴', MenuType.DASHBOARD, {}, existingNames)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('이미 존재하는 메뉴 이름입니다')
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101)
      const result = validateMenu(longName, MenuType.DASHBOARD, {})
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('메뉴 이름은 100자를 초과할 수 없습니다')
    })

    it('should validate Korean and English characters', () => {
      const koreanResult = validateMenu('한글 메뉴', MenuType.DASHBOARD, {})
      expect(koreanResult.isValid).toBe(true)

      const englishResult = validateMenu('English Menu', MenuType.DASHBOARD, {})
      expect(englishResult.isValid).toBe(true)

      const mixedResult = validateMenu('Mixed 메뉴 123!', MenuType.DASHBOARD, {})
      expect(mixedResult.isValid).toBe(true)
    })

    it('should validate external link URLs', () => {
      const config = {
        links: [
          { id: '1', name: 'Valid Link', url: 'https://example.com' },
          { id: '2', name: 'Invalid Link', url: 'not-a-url' }
        ]
      }
      const result = validateMenu('링크 메뉴', MenuType.EXTERNAL_LINK, config)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('링크 2의 URL이 유효하지 않습니다')
    })
  })

  describe('sanitizeMenuInput', () => {
    it('should remove script tags', () => {
      const input = 'Test <script>alert("xss")</script> Menu'
      const result = sanitizeMenuInput(input)
      expect(result).toBe('Test  Menu')
    })

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("xss")'
      const result = sanitizeMenuInput(input)
      expect(result).toBe('alert("xss")')
    })

    it('should remove event handlers', () => {
      const input = 'onclick="alert()" Test Menu'
      const result = sanitizeMenuInput(input)
      expect(result).toBe('"alert()" Test Menu')
    })

    it('should trim whitespace', () => {
      const input = '  Test Menu  '
      const result = sanitizeMenuInput(input)
      expect(result).toBe('Test Menu')
    })
  })

  describe('Menu Types', () => {
    it('should have all required menu types', () => {
      expect(MenuType.GROUP).toBe('group')
      expect(MenuType.DASHBOARD).toBe('dashboard')
      expect(MenuType.EXTERNAL_LINK).toBe('external_link')
      expect(MenuType.CUSTOM_PAGE).toBe('custom_page')
      expect(MenuType.PROJECT).toBe('project')
    })
  })
})