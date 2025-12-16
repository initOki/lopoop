// components/AdventureIslands.tsx
import { useState, useEffect } from 'react'
import { MapPin, Skull, Anchor } from 'lucide-react'

const API_BASE = 'https://developer-lostark.game.onstove.com'

interface CalendarItem {
  CategoryName: string
  ContentsName: string
  ContentsIcon: string
  StartTimes: string[]
  RewardItems: Array<{
    Items: Array<{
      Name: string
      Icon: string
      Grade: string
    }>
  }>
}

interface ContentWithTime extends CalendarItem {
  nextStartTime: Date | null
  timeRemaining: string
}

export default function AdventureIslands() {
  const [islands, setIslands] = useState<ContentWithTime[]>([])
  const [chaosGates, setChaosGates] = useState<ContentWithTime[]>([])
  const [fieldBosses, setFieldBosses] = useState<ContentWithTime[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCalendarData()

    // 매분마다 남은 시간 업데이트
    const updateTimer = setInterval(() => {
      updateTimeRemaining()
    }, 1000) // 1초마다 업데이트

    // 매일 오전 6시에 정보 갱신
    const refreshTimer = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        fetchCalendarData()
      }
    }, 60000)

    return () => {
      clearInterval(updateTimer)
      clearInterval(refreshTimer)
    }
  }, [])

  const updateTimeRemaining = () => {
    const update = (items: ContentWithTime[]) =>
      items.map(item => ({
        ...item,
        timeRemaining: item.nextStartTime ? calculateTimeRemaining(item.nextStartTime) : '정보 없음'
      }))

    setIslands(prev => update(prev))
    setChaosGates(prev => update(prev))
    setFieldBosses(prev => update(prev))
  }

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true)
      const apiKey = import.meta.env.VITE_LOA_API_KEY
      
      if (!apiKey) {
        console.error('API Key not found')
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE}/gamecontents/calendar`, {
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status}`)
      }

      const data: CalendarItem[] = await response.json()
      
      // 카테고리별로 필터링
      const adventureIslands = data.filter(item => item.CategoryName === '모험 섬')
      const chaosGates = data.filter(item => item.CategoryName === '카오스게이트')
      const fieldBosses = data.filter(item => item.CategoryName === '필드보스')

      // 시간 계산 및 정렬
      setIslands(processItems(adventureIslands))
      setChaosGates(processItems(chaosGates))
      setFieldBosses(processItems(fieldBosses))
    } catch (error) {
      console.error('Error fetching calendar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processItems = (items: CalendarItem[]): ContentWithTime[] => {
    const itemsWithTime = items.map(item => {
      const nextTime = getNextStartTime(item.StartTimes)
      return {
        ...item,
        nextStartTime: nextTime,
        timeRemaining: nextTime ? calculateTimeRemaining(nextTime) : '정보 없음'
      }
    })

    // 가장 빨리 시작하는 순서로 정렬
    return itemsWithTime.sort((a, b) => {
      if (!a.nextStartTime) return 1
      if (!b.nextStartTime) return -1
      return a.nextStartTime.getTime() - b.nextStartTime.getTime()
    })
  }

  const getNextStartTime = (startTimes: string[]): Date | null => {
    const now = new Date()
        
    for (const timeStr of startTimes) {
      // ISO 형식 문자열을 Date 객체로 변환
      const startTime = new Date(timeStr)
      
      if (startTime > now) {
        return startTime
      }
    }

    return null
  }

  const calculateTimeRemaining = (targetTime: Date): string => {
    const now = new Date()
    const diff = targetTime.getTime() - now.getTime()
    
    if (diff < 0) return '진행 중'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const ContentSection = ({ 
    title, 
    icon: Icon, 
    items, 
    iconColor,
    showOnlyTime = false
  }: { 
    title: string
    icon: any
    items: ContentWithTime[]
    iconColor: string
    showOnlyTime?: boolean
  }) => {
    if (items.length === 0) {
      return (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={iconColor} size={20} />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <div className="text-center py-4 text-gray-400 text-sm">
            오늘은 {title}이(가) 없습니다.
          </div>
        </div>
      )
    }

    if (showOnlyTime) {
      // 카오스게이트, 필드보스: 다음 한 개만 시간 표시
      const nextItem = items[0]
      return (
        <div className="flex items-center gap-3">
          <Icon className={iconColor} size={18} />
          <h3 className="text-base font-semibold text-white min-w-[100px]">{title}</h3>
          <div className="text-blue-400 font-mono text-sm">
            {nextItem.timeRemaining}
          </div>
        </div>
      )
    }

    // 모험섬: 카드로 표시 (최대 3개)
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className={iconColor} size={20} />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="bg-gray-700 rounded-lg p-3 hover:bg-gray-650 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={item.ContentsIcon} 
                  alt={item.ContentsName}
                  className="w-12 h-12 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">
                    {item.ContentsName}
                  </h4>
                  <div className="text-blue-400 font-mono text-sm mt-1">
                    {item.timeRemaining}
                  </div>
                  
                  {/* 보상 아이템 */}
                  {item.RewardItems.length > 0 && item.RewardItems[0].Items.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {item.RewardItems[0].Items.slice(0, 4).map((rewardItem, rewardIdx) => (
                        <img 
                          key={rewardIdx}
                          src={rewardItem.Icon} 
                          alt={rewardItem.Name}
                          className="w-6 h-6 rounded border border-gray-600"
                          title={rewardItem.Name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-xl p-6">
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">오늘의 일정</h2>
      
      {/* 모험섬 */}
      <ContentSection 
        title="모험섬" 
        icon={MapPin} 
        items={islands}
        iconColor="text-blue-400"
      />

      {/* 카오스게이트 & 필드보스 - 맨 아래 같은 줄에 */}
      <div className="bg-gray-700 rounded-lg p-4 space-y-3">
        <ContentSection 
          title="카오스게이트" 
          icon={Anchor} 
          items={chaosGates}
          iconColor="text-purple-400"
          showOnlyTime={true}
        />
        
        <ContentSection 
          title="필드보스" 
          icon={Skull} 
          items={fieldBosses}
          iconColor="text-red-400"
          showOnlyTime={true}
        />
      </div>
    </div>
  )
}