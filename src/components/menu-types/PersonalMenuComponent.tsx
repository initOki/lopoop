import { useState } from 'react'
import { User, Wallet, Calendar, Settings } from 'lucide-react'
import type { MenuComponentProps } from '../../types/custom-menu'
import PersonalDebtPage from './PersonalDebtPage'
import PersonalSchedulePage from './PersonalSchedulePage'

type PersonalTab = 'debt' | 'schedule' | 'settings'

export function PersonalMenuComponent({ menu }: MenuComponentProps) {
  const [activeTab, setActiveTab] = useState<PersonalTab>('debt')

  // 사용자 ID 추출 (메뉴의 user_id 사용)
  const userId = menu.user_id

  const tabs = [
    {
      id: 'debt' as PersonalTab,
      label: '빚 관리',
      icon: Wallet,
      description: '개인 빚을 관리합니다',
    },
    {
      id: 'schedule' as PersonalTab,
      label: '스케줄',
      icon: Calendar,
      description: '개인 스케줄을 관리합니다',
    },
    {
      id: 'settings' as PersonalTab,
      label: '설정',
      icon: Settings,
      description: '개인 설정을 관리합니다',
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'debt':
        return <PersonalDebtPage userId={userId} />
      case 'schedule':
        return <PersonalSchedulePage userId={userId} />
      case 'settings':
        return (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">개인 설정</h2>
              </div>
              <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
                개인 설정 기능은 준비 중입니다.
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* 헤더 */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">{menu.name}</h2>
            <p className="text-sm text-muted-foreground">
              개인 빚 관리와 스케줄을 따로 관리할 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-border">
        <nav className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 탭 설명 */}
      <div className="px-6 py-3 bg-muted/30 border-b border-border">
        <p className="text-sm text-muted-foreground">
          {tabs.find((tab) => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  )
}