import { useState } from 'react'
import { BarChart3, Grid3X3, List, Plus, Settings, Move, Trash2, TrendingUp, Target, Award, Activity, CalendarIcon } from 'lucide-react'
import type { MenuComponentProps, DashboardMenuConfig, Widget } from '../../types/custom-menu'

export function DashboardMenuComponent({ menu, onUpdate }: MenuComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showWidgetSelector, setShowWidgetSelector] = useState(false)
  const config = menu.config as DashboardMenuConfig

  const handleConfigUpdate = (newConfig: Partial<DashboardMenuConfig>) => {
    onUpdate({
      config: { ...config, ...newConfig }
    })
  }

  const handleLayoutChange = (layout: 'grid' | 'list' | 'custom') => {
    handleConfigUpdate({ layout })
  }

  const handleAddWidget = (widgetType: Widget['type']) => {
    const widgetConfigs = {
      counter: {
        title: '새 카운터',
        value: 0,
        target: 100,
        color: 'blue',
        unit: ''
      },
      chart: {
        title: '새 차트',
        chartType: 'line',
        data: [],
        color: 'blue'
      },
      table: {
        title: '새 테이블',
        headers: ['항목', '값'],
        rows: []
      },
      calendar: {
        title: '개인 캘린더',
        events: [],
        view: 'month'
      },
      progress: {
        title: '진행률 추적',
        current: 0,
        target: 100,
        unit: '%',
        color: 'green'
      },
      goals: {
        title: '목표 관리',
        goals: [],
        completedGoals: 0
      }
    }

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      position: { x: 0, y: 0, w: 2, h: 2 },
      config: widgetConfigs[widgetType] || { title: '새 위젯' }
    }

    handleConfigUpdate({
      widgets: [...config.widgets, newWidget]
    })
    setShowWidgetSelector(false)
  }

  const handleRemoveWidget = (widgetId: string) => {
    handleConfigUpdate({
      widgets: config.widgets.filter(w => w.id !== widgetId)
    })
  }

  const handleWidgetUpdate = (widgetId: string, updates: Partial<Widget>) => {
    handleConfigUpdate({
      widgets: config.widgets.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      )
    })
  }

  const getWidgetTypeLabel = (type: Widget['type']) => {
    switch (type) {
      case 'chart': return '차트'
      case 'table': return '테이블'
      case 'counter': return '카운터'
      case 'calendar': return '캘린더'
      case 'progress': return '진행률'
      case 'goals': return '목표'
      default: return '위젯'
    }
  }

  const getWidgetTypeIcon = (type: Widget['type']) => {
    switch (type) {
      case 'chart': return BarChart3
      case 'table': return Grid3X3
      case 'counter': return TrendingUp
      case 'calendar': return CalendarIcon
      case 'progress': return Activity
      case 'goals': return Target
      default: return BarChart3
    }
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">대시보드 설정</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings size={16} />
              {isEditing ? '편집 완료' : '편집 모드'}
            </button>
            <button
              onClick={() => setShowWidgetSelector(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus size={16} />
              위젯 추가
            </button>
          </div>
        </div>

        {/* Widget Selector Modal */}
        {showWidgetSelector && (
          <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">위젯 선택</h4>
              <button
                onClick={() => setShowWidgetSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { type: 'counter', label: '카운터', icon: TrendingUp, desc: '숫자 추적' },
                { type: 'progress', label: '진행률', icon: Activity, desc: '목표 진행률' },
                { type: 'goals', label: '목표', icon: Target, desc: '개인 목표 관리' },
                { type: 'chart', label: '차트', icon: BarChart3, desc: '데이터 시각화' },
                { type: 'table', label: '테이블', icon: Grid3X3, desc: '데이터 표' },
                { type: 'calendar', label: '캘린더', icon: CalendarIcon, desc: '개인 일정' }
              ].map(({ type, label, icon: Icon, desc }) => (
                <button
                  key={type}
                  onClick={() => handleAddWidget(type as Widget['type'])}
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-left"
                >
                  <Icon size={20} className="text-cyan-600 mb-2" />
                  <div className="font-medium text-gray-900 text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout Options */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">레이아웃:</span>
          <div className="flex items-center gap-2">
            {[
              { value: 'grid', label: '그리드', icon: Grid3X3 },
              { value: 'list', label: '리스트', icon: List },
              { value: 'custom', label: '커스텀', icon: Move }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleLayoutChange(value as any)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  config.layout === value
                    ? 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          위젯 ({config.widgets.length})
        </h3>

        {config.widgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">개인 대시보드를 시작하세요</h4>
            <p className="text-gray-600 mb-4">
              위젯을 추가하여 개인 목표, 진행률, 일정 등을 추적하고 관리하세요.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 max-w-md mx-auto">
              {[
                { type: 'counter', label: '카운터', icon: TrendingUp },
                { type: 'progress', label: '진행률', icon: Activity },
                { type: 'goals', label: '목표', icon: Target }
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleAddWidget(type as Widget['type'])}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors"
                >
                  <Icon size={20} className="text-cyan-600 mx-auto mb-1" />
                  <div className="text-sm font-medium text-gray-900">{label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWidgetSelector(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus size={16} />
              더 많은 위젯 보기
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            config.layout === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {config.widgets.map((widget) => {
              const Icon = getWidgetTypeIcon(widget.type)
              return (
                <div
                  key={widget.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative group"
                >
                  {/* Widget Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-cyan-600" />
                      <h4 className="font-medium text-gray-900">
                        {widget.config.title || getWidgetTypeLabel(widget.type)}
                      </h4>
                    </div>
                    
                    {isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRemoveWidget(widget.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="위젯 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Widget Content */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      타입: {getWidgetTypeLabel(widget.type)}
                    </div>
                    
                    {widget.type === 'counter' && (
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-cyan-600">
                          {widget.config.value || 0}
                          {widget.config.unit && <span className="text-sm ml-1">{widget.config.unit}</span>}
                        </div>
                        {widget.config.target && (
                          <div className="text-xs text-gray-500">
                            목표: {widget.config.target}{widget.config.unit}
                          </div>
                        )}
                      </div>
                    )}

                    {widget.type === 'progress' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{widget.config.current || 0}{widget.config.unit}</span>
                          <span>{widget.config.target || 100}{widget.config.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, ((widget.config.current || 0) / (widget.config.target || 100)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          {Math.round(((widget.config.current || 0) / (widget.config.target || 100)) * 100)}% 완료
                        </div>
                      </div>
                    )}

                    {widget.type === 'goals' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold text-green-600">
                            {widget.config.completedGoals || 0}
                          </div>
                          <div className="text-sm text-gray-500">
                            / {(widget.config.goals || []).length} 목표
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {(widget.config.goals || []).length > 0 
                            ? `${Math.round(((widget.config.completedGoals || 0) / (widget.config.goals || []).length) * 100)}% 달성`
                            : '목표를 추가하세요'
                          }
                        </div>
                      </div>
                    )}
                    
                    {widget.type === 'chart' && (
                      <div className="h-24 bg-gray-50 rounded flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                          <div className="text-xs text-gray-500">차트 데이터</div>
                        </div>
                      </div>
                    )}
                    
                    {widget.type === 'table' && (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-200 rounded"></div>
                        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          테이블 데이터
                        </div>
                      </div>
                    )}
                    
                    {widget.type === 'calendar' && (
                      <div className="h-20 bg-gray-50 rounded flex items-center justify-center">
                        <div className="text-center">
                          <CalendarIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                          <div className="text-xs text-gray-500">개인 일정</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Widget Settings (when editing) */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={widget.config.title || ''}
                          onChange={(e) => handleWidgetUpdate(widget.id, {
                            config: { ...widget.config, title: e.target.value }
                          })}
                          placeholder="위젯 제목"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        
                        {widget.type === 'counter' && (
                          <>
                            <input
                              type="number"
                              value={widget.config.value || 0}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, value: parseInt(e.target.value) || 0 }
                              })}
                              placeholder="현재 값"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="number"
                              value={widget.config.target || 100}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, target: parseInt(e.target.value) || 100 }
                              })}
                              placeholder="목표 값"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="text"
                              value={widget.config.unit || ''}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, unit: e.target.value }
                              })}
                              placeholder="단위 (예: 개, %, 시간)"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </>
                        )}

                        {widget.type === 'progress' && (
                          <>
                            <input
                              type="number"
                              value={widget.config.current || 0}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, current: parseInt(e.target.value) || 0 }
                              })}
                              placeholder="현재 진행률"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="number"
                              value={widget.config.target || 100}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, target: parseInt(e.target.value) || 100 }
                              })}
                              placeholder="목표 값"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="text"
                              value={widget.config.unit || '%'}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, unit: e.target.value }
                              })}
                              placeholder="단위"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </>
                        )}

                        {widget.type === 'goals' && (
                          <div className="space-y-2">
                            <input
                              type="number"
                              value={widget.config.completedGoals || 0}
                              onChange={(e) => handleWidgetUpdate(widget.id, {
                                config: { ...widget.config, completedGoals: parseInt(e.target.value) || 0 }
                              })}
                              placeholder="완료된 목표 수"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <div className="text-xs text-gray-500">
                              목표 관리는 위젯을 클릭하여 상세 설정하세요
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Personal Tracking Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">개인 추적 도구 활용 팁</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>카운터:</strong> 일일 목표나 습관 추적에 활용하세요</li>
              <li>• <strong>진행률:</strong> 장기 프로젝트나 학습 진도를 시각화하세요</li>
              <li>• <strong>목표:</strong> 개인 목표를 설정하고 달성률을 관리하세요</li>
              <li>• <strong>캘린더:</strong> 개인 일정과 중요한 날짜를 기록하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}