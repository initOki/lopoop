import { useState } from 'react'
import { ExternalLink, Plus, Edit2, Trash2, Grid3X3, List, Globe, Link as LinkIcon } from 'lucide-react'
import type { MenuComponentProps, ExternalLinkMenuConfig } from '../../types/custom-menu'

interface LinkItem {
  id: string
  name: string
  url: string
  description?: string
  icon?: string
}

export function ExternalLinkMenuComponent({ menu, onUpdate }: MenuComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const config = menu.config as ExternalLinkMenuConfig

  const handleConfigUpdate = (newConfig: Partial<ExternalLinkMenuConfig>) => {
    onUpdate({
      config: { ...config, ...newConfig }
    })
  }

  const handleAddLink = (linkData: Omit<LinkItem, 'id'>) => {
    const newLink: LinkItem = {
      id: `link-${Date.now()}`,
      ...linkData
    }

    handleConfigUpdate({
      links: [...config.links, newLink]
    })
    setShowAddForm(false)
  }

  const handleUpdateLink = (linkId: string, updates: Partial<LinkItem>) => {
    handleConfigUpdate({
      links: config.links.map(link => 
        link.id === linkId ? { ...link, ...updates } : link
      )
    })
    setEditingLink(null)
  }

  const handleDeleteLink = (linkId: string) => {
    handleConfigUpdate({
      links: config.links.filter(link => link.id !== linkId)
    })
  }

  const handleLinkClick = (url: string) => {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      {/* Link Management Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">링크 관리</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit2 size={16} />
              {isEditing ? '편집 완료' : '편집 모드'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus size={16} />
              링크 추가
            </button>
          </div>
        </div>

        {/* Layout Options */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">레이아웃:</span>
          <div className="flex items-center gap-2">
            {[
              { value: 'grid', label: '그리드', icon: Grid3X3 },
              { value: 'list', label: '리스트', icon: List }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleConfigUpdate({ layout: value as any })}
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

      {/* Add Link Form */}
      {showAddForm && (
        <LinkForm
          onSubmit={handleAddLink}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Link Form */}
      {editingLink && (
        <LinkForm
          initialData={editingLink}
          onSubmit={(data) => handleUpdateLink(editingLink.id, data)}
          onCancel={() => setEditingLink(null)}
          isEditing
        />
      )}

      {/* Links Display */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          저장된 링크 ({config.links.length})
        </h3>

        {config.links.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">링크가 없습니다</h4>
            <p className="text-gray-600 mb-4">
              자주 방문하는 웹사이트 링크를 추가하여 빠르게 접근하세요.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus size={16} />
              첫 번째 링크 추가
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            config.layout === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {config.links.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative group hover:shadow-md transition-shadow"
              >
                {/* Link Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Globe size={16} className="text-cyan-600 flex-shrink-0" />
                    <h4 className="font-medium text-gray-900 truncate">
                      {link.name}
                    </h4>
                  </div>
                  
                  {isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingLink(link)}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        title="링크 편집"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="링크 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Link Description */}
                {link.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {link.description}
                  </p>
                )}

                {/* Link URL */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {link.url}
                  </span>
                </div>

                {/* Link Action */}
                <button
                  onClick={() => handleLinkClick(link.url)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors"
                >
                  <ExternalLink size={14} />
                  링크 열기
                </button>
              </div>
            ))}
            {/* Quick Access Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">빠른 접근</h4>
              <div className="flex flex-wrap gap-2">
                {config.links.slice(0, 5).map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link.url)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    <ExternalLink size={12} />
                    {link.name}
                  </button>
                ))}
                {config.links.length > 5 && (
                  <span className="text-sm text-green-700">
                    +{config.links.length - 5}개 더
                  </span>
                )}
              </div>
            </div>

            {/* Link Categories */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">링크 분류</h4>
              <div className="text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>총 링크 수:</span>
                  <span className="font-medium">{config.links.length}개</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>최근 추가:</span>
                  <span className="font-medium">
                    {config.links.length > 0 ? '오늘' : '없음'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Link Form Component
interface LinkFormProps {
  initialData?: LinkItem
  onSubmit: (data: Omit<LinkItem, 'id'>) => void
  onCancel: () => void
  isEditing?: boolean
}

function LinkForm({ initialData, onSubmit, onCancel, isEditing = false }: LinkFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    url: initialData?.url || '',
    description: initialData?.description || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) return
    
    onSubmit({
      name: formData.name.trim(),
      url: formData.url.trim(),
      description: formData.description.trim() || undefined
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h4 className="text-lg font-medium text-gray-900 mb-4">
        {isEditing ? '링크 편집' : '새 링크 추가'}
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            링크 이름 *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="예: Google, GitHub, 회사 홈페이지"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명 (선택사항)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="링크에 대한 간단한 설명..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            {isEditing ? '수정' : '추가'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}