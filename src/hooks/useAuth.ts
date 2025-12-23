import { useState, useEffect } from 'react'
import { getCurrentUser, onAuthStateChange, signInAnonymously } from '../lib/auth'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 사용자 정보 로드
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        // 사용자가 없으면 익명 로그인
        if (!currentUser) {
          const { user: anonUser, session: anonSession } = await signInAnonymously()
          setUser(anonUser)
          setSession(anonSession)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // 인증 상태 변화 리스너
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    session,
    loading,
    userId: user?.id || null
  }
}