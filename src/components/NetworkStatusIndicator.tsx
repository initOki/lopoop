import { WifiOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useNetworkState } from '../lib/network-error-handler'

interface NetworkStatusIndicatorProps {
  showText?: boolean
  className?: string
}

/**
 * Network status indicator component
 * Shows connection status and offline mode information
 * 요구사항 7.5: 네트워크 오류 처리 - 사용자에게 연결 상태 표시
 */
export function NetworkStatusIndicator({ 
  showText = false, 
  className = '' 
}: NetworkStatusIndicatorProps) {
  const { isOnline, isConnected, lastConnectedAt } = useNetworkState()

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: '오프라인',
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        description: '인터넷 연결이 없습니다'
      }
    }

    if (!isConnected) {
      return {
        icon: AlertCircle,
        text: '연결 불안정',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        description: '서버 연결이 불안정합니다'
      }
    }

    return {
      icon: CheckCircle,
      text: '온라인',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      description: '정상 연결됨'
    }
  }

  const status = getStatusInfo()
  const Icon = status.icon

  const formatLastConnected = () => {
    if (!lastConnectedAt) return ''
    
    const now = new Date()
    const diff = now.getTime() - lastConnectedAt.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}시간 전`
    
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  if (isOnline && isConnected) {
    // Don't show indicator when everything is working normally
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${status.bgColor}`}>
        <Icon className={`h-4 w-4 ${status.color}`} />
        {showText && (
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
        )}
      </div>
      
      {!isConnected && lastConnectedAt && (
        <span className="text-xs text-gray-500">
          마지막 연결: {formatLastConnected()}
        </span>
      )}
    </div>
  )
}

/**
 * Detailed network status component for settings or debug views
 */
export function DetailedNetworkStatus() {
  const { isOnline, isConnected, lastConnectedAt } = useNetworkState()

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-900 mb-3">네트워크 상태</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">브라우저 온라인:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? '예' : '아니오'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">서버 연결:</span>
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? '연결됨' : '연결 안됨'}
          </span>
        </div>
        
        {lastConnectedAt && (
          <div className="flex justify-between">
            <span className="text-gray-600">마지막 연결:</span>
            <span className="text-gray-900">
              {lastConnectedAt.toLocaleString('ko-KR')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}