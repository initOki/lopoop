import { useState } from 'react'
import { Calendar, Wallet } from 'lucide-react'
import GroupSchedulePage from './GroupSchedulePage'
import GroupDebtPage from './GroupDebtPage'

export function GroupMenuComponent() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'debts'>('schedule')

  const tabs = [
    { id: 'schedule', label: '스케줄', icon: Calendar },
    { id: 'debts', label: '빚 관리', icon: Wallet },
  ] as const

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-0">
        {activeTab === 'schedule' && (
          <div className="min-h-[600px]">
            <GroupSchedulePage />
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="min-h-[600px]">
            <GroupDebtPage />
          </div>
        )}
      </div>
    </div>
  )
}
