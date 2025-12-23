import { useState } from 'react'
import { FileText, Edit2, Eye, Save, X, BookOpen, FileEdit, Layout } from 'lucide-react'
import type { MenuComponentProps, CustomPageMenuConfig } from '../../types/custom-menu'

export function CustomPageMenuComponent({ menu, onUpdate }: MenuComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const config = menu.config as CustomPageMenuConfig

  const handleConfigUpdate = (newConfig: Partial<CustomPageMenuConfig>) => {
    onUpdate({
      config: { ...config, ...newConfig }
    })
  }

  const handleStartEdit = () => {
    setEditContent(config.content || '')
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    handleConfigUpdate({ content: editContent })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent('')
    setIsEditing(false)
  }

  const handleTemplateChange = (template: 'blank' | 'document' | 'wiki') => {
    let templateContent = config.content || ''
    
    if (!templateContent.trim()) {
      switch (template) {
        case 'document':
          templateContent = `# 문서 제목

## 개요
여기에 문서의 개요를 작성하세요.

## 내용
문서의 주요 내용을 작성하세요.

### 하위 섹션
필요에 따라 하위 섹션을 추가하세요.

## 결론
문서의 결론을 작성하세요.`
          break
        case 'wiki':
          templateContent = `# ${menu.name}

**${menu.name}**에 대한 위키 페이지입니다.

## 목차
1. [개요](#개요)
2. [상세 정보](#상세-정보)
3. [관련 링크](#관련-링크)

## 개요
여기에 개요를 작성하세요.

## 상세 정보
상세한 정보를 작성하세요.

## 관련 링크
- [링크 1](https://example.com)
- [링크 2](https://example.com)`
          break
        default:
          templateContent = ''
      }
    }

    handleConfigUpdate({ 
      template,
      content: templateContent
    })
  }

  const renderContent = (content: string) => {
    if (!content.trim()) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>내용이 없습니다. 편집 버튼을 클릭하여 내용을 추가하세요.</p>
        </div>
      )
    }

    // Simple markdown-like rendering
    return (
      <div className="prose max-w-none">
        {content.split('\n').map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mb-4 mt-6">{line.slice(2)}</h1>
          } else if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-semibold mb-3 mt-5">{line.slice(3)}</h2>
          } else if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-medium mb-2 mt-4">{line.slice(4)}</h3>
          } else if (line.startsWith('- ')) {
            return <li key={index} className="ml-4">{line.slice(2)}</li>
          } else if (line.trim() === '') {
            return <br key={index} />
          } else {
            return <p key={index} className="mb-2">{line}</p>
          }
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">페이지 설정</h3>
          <div className="flex items-center gap-2">
            {config.allowEdit && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Edit2 size={16} />
                편집
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save size={16} />
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                  취소
                </button>
              </>
            )}
          </div>
        </div>

        {/* Template Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              템플릿
            </label>
            <div className="flex items-center gap-2">
              {[
                { value: 'blank', label: '빈 페이지', icon: FileEdit },
                { value: 'document', label: '문서', icon: BookOpen },
                { value: 'wiki', label: '위키', icon: Layout }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleTemplateChange(value as any)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    config.template === value
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

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">편집 허용</label>
              <p className="text-sm text-gray-500">페이지 내용을 편집할 수 있습니다</p>
            </div>
            <button
              onClick={() => handleConfigUpdate({ allowEdit: !config.allowEdit })}
              className={`${
                config.allowEdit ? 'bg-cyan-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  config.allowEdit ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Content Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">페이지 내용</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isEditing ? (
                <span className="inline-flex items-center gap-1">
                  <Edit2 size={14} />
                  편집 모드
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Eye size={14} />
                  미리보기 모드
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 (마크다운 지원)
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="페이지 내용을 입력하세요...

마크다운 문법을 사용할 수 있습니다:
# 제목 1
## 제목 2
### 제목 3
- 목록 항목
"
                  className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              
              <div className="text-sm text-gray-500">
                <strong>팁:</strong> 마크다운 문법을 사용하여 텍스트를 포맷할 수 있습니다.
                # 제목, ## 부제목, - 목록 등을 사용해보세요.
              </div>
            </div>
          ) : (
            <div className="min-h-[200px]">
              {renderContent(config.content || '')}
            </div>
          )}
        </div>
      </div>

      {/* Content Statistics and Tools */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">페이지 정보</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">
              {(config.content || '').split('\n').length}
            </div>
            <div className="text-gray-600">줄 수</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">
              {(config.content || '').split(' ').filter(word => word.length > 0).length}
            </div>
            <div className="text-gray-600">단어 수</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">
              {(config.content || '').length}
            </div>
            <div className="text-gray-600">문자 수</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">
              {config.template === 'blank' ? '빈 페이지' : 
               config.template === 'document' ? '문서' : '위키'}
            </div>
            <div className="text-gray-600">템플릿</div>
          </div>
        </div>
      </div>

      {/* Content Editor Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">마크다운 사용법</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><code className="bg-blue-100 px-1 rounded"># 제목 1</code> - 큰 제목</div>
                <div><code className="bg-blue-100 px-1 rounded">## 제목 2</code> - 중간 제목</div>
                <div><code className="bg-blue-100 px-1 rounded">### 제목 3</code> - 작은 제목</div>
                <div><code className="bg-blue-100 px-1 rounded">- 목록</code> - 불릿 목록</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}