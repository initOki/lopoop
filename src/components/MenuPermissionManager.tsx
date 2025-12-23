import { useState, useEffect } from 'react'
import { Users, Shield, Eye, EyeOff, UserPlus, UserMinus, Crown, Settings } from 'lucide-react'
import { useMenuMembers } from '../hooks/useMenuMembers'
import { useMenuPermissions } from '../hooks/useMenuPermissions'
import { MemberRole } from '../lib/menu-permissions'
import type { CustomMenu } from '../types/custom-menu'
import type { MenuAccessInfo } from '../lib/menu-permissions'

interface MenuPermissionManagerProps {
  menu: CustomMenu
  userId: string
  onClose: () => void
}

/**
 * 메뉴 권한 관리 컴포넌트
 * 요구사항 7.3: 메뉴 접근 권한 확인 및 동적 가시성 업데이트
 */
export function MenuPermissionManager({ menu, userId, onClose }: MenuPermissionManagerProps) {
  const [access, setAccess] = useState<MenuAccessInfo | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const { members, loading: membersLoading, removeMember, refreshMembers } = useMenuMembers(menu.id)
  const { checkAccess, updateRole, updatePrivacy } = useMenuPermissions(userId)

  // 역할별 한국어 이름
  const getRoleName = (role: string) => {
    switch (role as MemberRole) {
      case MemberRole.OWNER:
        return '소유자'
      case MemberRole.ADMIN:
        return '관리자'
      case MemberRole.MEMBER:
        return '멤버'
      default:
        return '멤버'
    }
  }

  // 역할별 아이콘
  const getRoleIcon = (role: string) => {
    switch (role as MemberRole) {
      case MemberRole.OWNER:
        return Crown
      case MemberRole.ADMIN:
        return Shield
      case MemberRole.MEMBER:
        return Users
      default:
        return Users
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const menuAccess = await checkAccess(menu.id)
        setAccess(menuAccess)
        
        // 메뉴 설정에서 공개/비공개 상태 확인
        const config = menu.config as any
        setIsPrivate(config?.isPrivate || false)
      } catch (error) {
        console.error('Error loading menu permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [menu.id, checkAccess])

  // 공개/비공개 설정 변경
  const handlePrivacyChange = async (newIsPrivate: boolean) => {
    try {
      await updatePrivacy(menu.id, newIsPrivate)
      setIsPrivate(newIsPrivate)
    } catch (error) {
      console.error('Error updating privacy:', error)
      alert('공개 설정 변경에 실패했습니다')
    }
  }

  // 멤버 역할 변경
  const handleRoleChange = async (targetUserId: string, newRole: MemberRole) => {
    try {
      await updateRole(menu.id, targetUserId, newRole)
      await refreshMembers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('역할 변경에 실패했습니다')
    }
  }

  // 멤버 제거
  const handleRemoveMember = async (targetUserId: string) => {
    if (window.confirm('이 멤버를 그룹에서 제거하시겠습니까?')) {
      try {
        await removeMember(targetUserId)
      } catch (error) {
        console.error('Error removing member:', error)
        alert('멤버 제거에 실패했습니다')
      }
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">권한 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!access || !access.canManageMembers) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">접근 권한 없음</h2>
            <p className="text-gray-600 mb-4">
              {access?.reason || '이 메뉴의 권한을 관리할 수 없습니다'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">권한 관리</h2>
              <p className="text-sm text-gray-500">{menu.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 공개/비공개 설정 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">공개 설정</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  checked={!isPrivate}
                  onChange={() => handlePrivacyChange(false)}
                  className="text-blue-600"
                />
                <Eye className="w-4 h-4 text-green-600" />
                <span>공개 그룹</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  checked={isPrivate}
                  onChange={() => handlePrivacyChange(true)}
                  className="text-blue-600"
                />
                <EyeOff className="w-4 h-4 text-red-600" />
                <span>비공개 그룹</span>
              </label>
            </div>
            <p className="text-sm text-gray-500">
              {isPrivate 
                ? '멤버만 이 그룹에 접근할 수 있습니다'
                : '모든 사용자가 이 그룹을 볼 수 있습니다 (읽기 전용)'
              }
            </p>
          </div>

          {/* 멤버 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">그룹 멤버</h3>
              <button
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => {
                  // TODO: 멤버 추가 모달 구현
                  alert('멤버 추가 기능은 추후 구현 예정입니다')
                }}
              >
                <UserPlus className="w-4 h-4" />
                멤버 추가
              </button>
            </div>

            {membersLoading ? (
              <div className="text-center py-4 text-gray-500">
                멤버 목록을 불러오는 중...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                그룹 멤버가 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = getRoleIcon(member.role)
                  const isOwner = member.role === MemberRole.OWNER
                  const canModify = !isOwner && member.user_id !== userId
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <RoleIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.user_id}
                            {member.user_id === userId && ' (나)'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getRoleName(member.role)} • 
                            가입일: {new Date(member.joined_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {canModify && (
                        <div className="flex items-center gap-2">
                          {/* 역할 변경 */}
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user_id, e.target.value as MemberRole)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value={MemberRole.MEMBER}>멤버</option>
                            <option value={MemberRole.ADMIN}>관리자</option>
                          </select>

                          {/* 멤버 제거 */}
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                            title="멤버 제거"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 권한 안내 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">역할별 권한</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div><strong>소유자:</strong> 모든 권한 (삭제, 멤버 관리, 편집, 보기)</div>
              <div><strong>관리자:</strong> 멤버 관리, 편집, 보기 (삭제 불가)</div>
              <div><strong>멤버:</strong> 보기만 가능</div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}