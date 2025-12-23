import { useState } from 'react'
import { FolderOpen, CheckSquare, Clock, FileText, MessageSquare, Plus, Circle, CheckCircle, XCircle } from 'lucide-react'
import type { MenuComponentProps, ProjectMenuConfig } from '../../types/custom-menu'

export function ProjectMenuComponent({ menu, onUpdate }: MenuComponentProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline' | 'files' | 'discussions'>('overview')
  const config = menu.config as ProjectMenuConfig

  const handleConfigUpdate = (newConfig: Partial<ProjectMenuConfig>) => {
    onUpdate({
      config: { ...config, ...newConfig }
    })
  }

  const handleStatusChange = (status: 'active' | 'completed' | 'archived') => {
    handleConfigUpdate({ status })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Circle
      case 'completed': return CheckCircle
      case 'archived': return XCircle
      default: return Circle
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '진행 중'
      case 'completed': return '완료'
      case 'archived': return '보관됨'
      default: return '알 수 없음'
    }
  }

  const tabs = [
    { id: 'overview', label: '개요', icon: FolderOpen },
    { id: 'tasks', label: '작업', icon: CheckSquare, enabled: config.features.tasks },
    { id: 'timeline', label: '타임라인', icon: Clock, enabled: config.features.timeline },
    { id: 'files', label: '파일', icon: FileText, enabled: config.features.files },
    { id: 'discussions', label: '토론', icon: MessageSquare, enabled: config.features.discussions }
  ] as const

  const enabledTabs = tabs.filter(tab => tab.id === 'overview' || tab.enabled)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Project Status Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-cyan-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{menu.name}</h2>
              <p className="text-sm text-gray-600">{config.description || '프로젝트 설명이 없습니다.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['active', 'completed', 'archived'] as const).map((status) => {
              const Icon = getStatusIcon(status)
              const isSelected = config.status === status
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected 
                      ? getStatusColor(status)
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} />
                  {getStatusLabel(status)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {enabledTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  isActive
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">프로젝트 설정</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프로젝트 설명
                  </label>
                  <textarea
                    value={config.description || ''}
                    onChange={(e) => handleConfigUpdate({ description: e.target.value })}
                    placeholder="프로젝트에 대한 설명을 입력하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">기능 설정</h3>
              <div className="space-y-3">
                {Object.entries(config.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {feature === 'tasks' && '작업 관리'}
                        {feature === 'timeline' && '타임라인'}
                        {feature === 'files' && '파일 공유'}
                        {feature === 'discussions' && '토론'}
                      </label>
                      <p className="text-sm text-gray-500">
                        {feature === 'tasks' && '프로젝트 작업을 생성하고 관리합니다'}
                        {feature === 'timeline' && '프로젝트 일정과 마일스톤을 추적합니다'}
                        {feature === 'files' && '프로젝트 관련 파일을 공유합니다'}
                        {feature === 'discussions' && '팀원들과 토론할 수 있습니다'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfigUpdate({ 
                        features: { ...config.features, [feature]: !enabled }
                      })}
                      className={`${
                        enabled ? 'bg-cyan-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Stats */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">프로젝트 현황</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">완료된 작업</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Circle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">진행 중 작업</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">파일</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">토론</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && config.features.tasks && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">작업 관리</h3>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                <Plus size={16} />
                작업 추가
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">작업 관리 기능</h4>
              <p className="text-gray-600">
                프로젝트 작업 관리 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && config.features.timeline && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">프로젝트 타임라인</h3>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                <Plus size={16} />
                마일스톤 추가
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">타임라인 기능</h4>
              <p className="text-gray-600">
                프로젝트 타임라인 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'files' && config.features.files && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">파일 공유</h3>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                <Plus size={16} />
                파일 업로드
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">파일 공유 기능</h4>
              <p className="text-gray-600">
                프로젝트 파일 공유 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'discussions' && config.features.discussions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">팀 토론</h3>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                <Plus size={16} />
                토론 시작
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">토론 기능</h4>
              <p className="text-gray-600">
                팀 토론 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}