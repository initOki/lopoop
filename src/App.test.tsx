import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.tsx'

// Mock the Link component to avoid router context issues
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// Mock Supabase
vi.mock('./lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}))

describe('App', () => {
  test('renders main sections', () => {
    render(<App />)
    
    // Check for main content sections
    expect(screen.getByText('미완료 레이드')).toBeDefined()
    expect(screen.getByText('최근 빚 목록')).toBeDefined()
  })
})
