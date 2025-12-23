import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Clock, Activity } from 'lucide-react'
import { checkRateLimit } from '../lib/input-validation-security'

interface SecurityAuditEntry {
  userId: string
  action: string
  timestamp: Date
  details: any
  severity: 'low' | 'medium' | 'high'
}

interface SecurityMonitorProps {
  userId: string
  className?: string
}

/**
 * Security monitoring component for displaying security events and rate limiting status
 * 요구사항 8.1, 8.2: 보안 모니터링 및 사용자 피드백
 */
export function SecurityMonitor({ userId, className = '' }: SecurityMonitorProps) {
  const [auditLog, setAuditLog] = useState<SecurityAuditEntry[]>([])
  const [rateLimitStatus, setRateLimitStatus] = useState({
    allowed: true,
    remainingActions: 30,
    resetTime: Date.now() + 60000
  })

  // Load audit log from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('security_audit_log')
      if (stored) {
        const logs = JSON.parse(stored).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
        
        // Filter logs for current user and last 24 hours
        const userLogs = logs
          .filter((entry: SecurityAuditEntry) => entry.userId === userId)
          .filter((entry: SecurityAuditEntry) => 
            Date.now() - entry.timestamp.getTime() < 24 * 60 * 60 * 1000
          )
          .sort((a: SecurityAuditEntry, b: SecurityAuditEntry) => 
            b.timestamp.getTime() - a.timestamp.getTime()
          )
          .slice(0, 10) // Show only last 10 events
        
        setAuditLog(userLogs)
      }
    } catch (error) {
      console.error('Error loading security audit log:', error)
    }
  }, [userId])

  // Update rate limit status
  useEffect(() => {
    const updateRateLimit = () => {
      const status = checkRateLimit(userId)
      setRateLimitStatus(status)
    }

    updateRateLimit()
    const interval = setInterval(updateRateLimit, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [userId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return AlertTriangle
      case 'medium': return Shield
      case 'low': return Activity
      default: return Shield
    }
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'menu_created': '메뉴 생성됨',
      'menu_updated': '메뉴 업데이트됨',
      'menu_creation_blocked': '메뉴 생성 차단됨',
      'menu_update_blocked': '메뉴 업데이트 차단됨',
      'menu_creation_warnings': '메뉴 생성 경고',
      'menu_update_warnings': '메뉴 업데이트 경고',
      'menu_limit_exceeded': '메뉴 한도 초과'
    }
    
    return actionMap[action] || action
  }

  const formatTimeRemaining = (resetTime: number) => {
    const remaining = Math.max(0, resetTime - Date.now())
    const minutes = Math.floor(remaining / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}분 ${seconds}초`
    }
    return `${seconds}초`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Rate Limit Status */}
      <div className="bg-gray-800 rounded-xl shadow-xl border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-white" />
          <h3 className="text-sm font-medium text-white">요청 제한 상태</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white">남은 요청 수:</span>
            <span className={`font-medium ${
              rateLimitStatus.remainingActions < 5 ? 'text-red-600' : 'text-green-600'
            }`}>
              {rateLimitStatus.remainingActions}/30
            </span>
          </div>
          
          {!rateLimitStatus.allowed && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">재설정까지:</span>
              <span className="font-medium text-red-600">
                {formatTimeRemaining(rateLimitStatus.resetTime)}
              </span>
            </div>
          )}
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                rateLimitStatus.remainingActions < 5 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ 
                width: `${(rateLimitStatus.remainingActions / 30) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Security Events */}
      {auditLog.length > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-white" />
            <h3 className="text-sm font-medium text-white">보안 이벤트</h3>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLog.map((entry, index) => {
              const SeverityIcon = getSeverityIcon(entry.severity)
              
              return (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-2 rounded-md bg-gray-900  shadow-xl ${getSeverityColor(entry.severity)}`}
                >
                  <SeverityIcon className="h-4 w-4 mt-0.5 shrink-0 text-white" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {formatAction(entry.action)}
                      </span>
                      <span className="text-xs opacity-75 text-gray-300">
                        {entry.timestamp.toLocaleTimeString('ko-KR')}
                      </span>
                    </div>
                    
                    {entry.details && (
                      <div className="text-xs mt-1 opacity-75 text-white">
                        {entry.details.menuName && (
                          <span>메뉴: {entry.details.menuName}</span>
                        )}
                        {entry.details.errors && (
                          <div className="mt-1">
                            오류: {entry.details.errors.join(', ')}
                          </div>
                        )}
                        {entry.details.warnings && (
                          <div className="mt-1">
                            경고: {entry.details.warnings.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact security status indicator for header/toolbar
 */
export function SecurityStatusIndicator({ userId }: { userId: string }) {
  const [rateLimitStatus, setRateLimitStatus] = useState({
    allowed: true,
    remainingActions: 30,
    resetTime: Date.now() + 60000
  })

  useEffect(() => {
    const updateRateLimit = () => {
      const status = checkRateLimit(userId)
      setRateLimitStatus(status)
    }

    updateRateLimit()
    const interval = setInterval(updateRateLimit, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [userId])

  // Only show when rate limit is low or exceeded
  if (rateLimitStatus.remainingActions > 10) {
    return null
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 text-yellow-700">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs font-medium">
        요청 제한: {rateLimitStatus.remainingActions}/30
      </span>
    </div>
  )
}