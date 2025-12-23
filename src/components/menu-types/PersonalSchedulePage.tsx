import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X, Edit2, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import PersonalRaidSetup from '@/components/PersonalRaidSetup'
import type { ExpeditionCharacter } from '@/types/loa'

// 개인 스케줄 타입 정의
interface PersonalSchedule {
  id: string
  user_id: string
  title: string
  description?: string
  type: 'raid'
  participants: string[]
  is_completed: boolean
  created_at: string
}

// Supabase 데이터베이스 타입 정의
interface PersonalScheduleRow {
  id: string
  user_id: string
  title: string
  description: string | null
  type: 'raid'
  participants: string[]
  is_completed: boolean
  created_at: string
}

interface PersonalSchedulePageProps {
  userId: string
}

export default function PersonalSchedulePage({ userId }: PersonalSchedulePageProps) {
  const [schedules, setSchedules] = useState<PersonalSchedule[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingSchedule, setEditingSchedule] = useState<PersonalSchedule | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'raid' as const,
    participants: [] as string[],
  })
  
  // 레이드 관련 상태 (단일 슬롯만 사용)
  const [selectedRaid, setSelectedRaid] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<(ExpeditionCharacter | null)[]>([null, null, null, null])

  // Supabase에서 개인 스케줄 목록 가져오기 및 실시간 구독
  useEffect(() => {
    fetchSchedules()

    // Supabase 실시간 구독 설정 (개인 스케줄만)
    const channel = supabase
      .channel('personal-schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personal_schedules',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Personal Schedule realtime update:', payload)
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as PersonalScheduleRow
            const newSchedule: PersonalSchedule = {
              id: newRow.id,
              user_id: newRow.user_id,
              title: newRow.title,
              description: newRow.description ?? undefined,
              type: newRow.type,
              participants: newRow.participants,
              is_completed: newRow.is_completed,
              created_at: newRow.created_at,
            }
            // 중복 방지: 이미 존재하는 스케줄인지 확인
            setSchedules((prev) => {
              const exists = prev.some(schedule => schedule.id === newSchedule.id)
              if (exists) return prev
              return [newSchedule, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as PersonalScheduleRow
            setSchedules((prev) => {
              const exists = prev.some(schedule => schedule.id === updatedRow.id)
              if (!exists) return prev // 존재하지 않는 항목은 업데이트하지 않음
              
              return prev.map((schedule) =>
                schedule.id === updatedRow.id
                  ? {
                      id: updatedRow.id,
                      user_id: updatedRow.user_id,
                      title: updatedRow.title,
                      description: updatedRow.description ?? undefined,
                      type: updatedRow.type,
                      participants: updatedRow.participants,
                      is_completed: updatedRow.is_completed,
                      created_at: updatedRow.created_at,
                    }
                  : schedule,
              )
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as PersonalScheduleRow
            setSchedules((prev) => {
              const exists = prev.some(schedule => schedule.id === deletedRow.id)
              if (!exists) return prev // 이미 삭제된 항목은 처리하지 않음
              
              return prev.filter((schedule) => schedule.id !== deletedRow.id)
            })
          }
        },
      )
      .subscribe((status) => {
        console.log('Personal Schedule subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to personal schedules realtime updates')
          setIsRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to personal schedules realtime updates')
          setIsRealtimeConnected(false)
          toast.error('실시간 업데이트 연결에 실패했습니다.')
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false)
          console.warn('Personal schedules realtime connection closed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchSchedules = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('personal_schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedSchedules: PersonalSchedule[] =
        (data as PersonalScheduleRow[])?.map((schedule) => ({
          id: schedule.id,
          user_id: schedule.user_id,
          title: schedule.title,
          description: schedule.description ?? undefined,
          type: schedule.type,
          participants: schedule.participants,
          is_completed: schedule.is_completed,
          created_at: schedule.created_at,
        })) || []

      setSchedules(formattedSchedules)
    } catch (error) {
      console.error('Error fetching personal schedules:', error)
      toast.error('개인 스케줄을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSchedule) {
      await handleUpdate()
    } else {
      try {
        // 레이드 타입이므로 선택된 캐릭터를 참가자로 설정
        let participants: string[] = []
        const selectedCharacter = selectedSlots.find(slot => slot !== null)
        if (selectedCharacter) {
          participants = [`${selectedCharacter.CharacterName} / ${selectedCharacter.CharacterClassName} (${selectedCharacter.ItemLevel.toLocaleString()})`]
        }

        const scheduleToInsert = {
          user_id: userId,
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          participants: participants,
        }

        const { error } = await supabase.from('personal_schedules').insert([scheduleToInsert])

        if (error) throw error

        toast.success('개인 스케줄이 추가되었습니다.')

        // 실시간 연결이 끊어진 경우 백업 새로고침
        if (!isRealtimeConnected) {
          setTimeout(() => fetchSchedules(), 1000)
        }

        resetForm()
        setIsFormOpen(false)
      } catch (error) {
        console.error('Error creating personal schedule:', error)
        toast.error('개인 스케줄을 추가하는데 실패했습니다.')
      }
    }
  }

  const handleUpdate = async () => {
    if (!editingSchedule) return

    try {
      // 레이드 타입이므로 선택된 캐릭터를 참가자로 설정
      let participants: string[] = []
      const selectedCharacter = selectedSlots.find(slot => slot !== null)
      if (selectedCharacter) {
        participants = [`${selectedCharacter.CharacterName} / ${selectedCharacter.CharacterClassName} (${selectedCharacter.ItemLevel.toLocaleString()})`]
      }

      const { error } = await supabase
        .from('personal_schedules')
        .update({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          participants: participants,
        })
        .eq('id', editingSchedule.id)

      if (error) throw error

      toast.success('개인 스케줄이 수정되었습니다.')

      // 실시간 연결이 끊어진 경우 백업 새로고침
      if (!isRealtimeConnected) {
        setTimeout(() => fetchSchedules(), 1000)
      }

      resetForm()
      setIsFormOpen(false)
      setEditingSchedule(null)
    } catch (error) {
      console.error('Error updating personal schedule:', error)
      toast.error('개인 스케줄을 수정하는데 실패했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'raid',
      participants: [],
    })
    setSelectedRaid('')
    setSelectedSlots([null, null, null, null])
  }

  const handleEdit = (schedule: PersonalSchedule) => {
    setEditingSchedule(schedule)
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      type: schedule.type,
      participants: schedule.participants,
    })
    
    // 캐릭터 정보 파싱 시도 (완벽하지 않을 수 있음)
    setSelectedSlots([null, null, null, null])
    
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingSchedule(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('personal_schedules')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setSchedules((prev) => prev.filter((schedule) => schedule.id !== id))

      toast.success('개인 스케줄이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting personal schedule:', error)
      toast.error('개인 스케줄을 삭제하는데 실패했습니다.')
      
      // 삭제 실패 시 데이터 다시 불러오기
      fetchSchedules()
    }
  }

  const toggleCompleted = async (id: string) => {
    const schedule = schedules.find((s) => s.id === id)
    if (!schedule) return

    const newCompletedState = !schedule.is_completed

    try {
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, is_completed: newCompletedState } : s
        )
      )

      const { error } = await supabase
        .from('personal_schedules')
        .update({ is_completed: newCompletedState })
        .eq('id', id)

      if (error) throw error

      toast.success(
        schedule.is_completed ? '미완료로 변경되었습니다.' : '완료로 표시되었습니다.',
      )
    } catch (error) {
      console.error('Error updating personal schedule:', error)
      toast.error('개인 스케줄 상태를 변경하는데 실패했습니다.')
      
      // 업데이트 실패 시 원래 상태로 되돌리기
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, is_completed: schedule.is_completed } : s
        )
      )
    }
  }

  const getScheduleTypeLabel = () => {
    return '레이드'
  }

  const getScheduleTypeColor = () => {
    return 'bg-red-500/20 text-red-400'
  }



  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">개인 스케줄</h2>
            {/* 실시간 연결 상태 인디케이터 */}
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isRealtimeConnected ? '실시간 연결됨' : '실시간 연결 끊김'} />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />새 스케줄 추가
          </button>
        </div>

        {/* 스케줄 목록 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
              로딩 중...
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-muted rounded-lg shadow p-8 text-center text-muted-foreground">
              등록된 개인 스케줄이 없습니다. 새 스케줄을 추가해보세요.
            </div>
          ) : (
            schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`bg-gray-900 border border-border rounded-lg shadow-sm p-6 ${
                  schedule.is_completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg text-foreground">
                        {schedule.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${getScheduleTypeColor()}`}>
                        {getScheduleTypeLabel()}
                      </span>
                      {schedule.is_completed && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                          완료
                        </span>
                      )}
                    </div>

                    <div className="text-foreground space-y-2">
                      {schedule.description && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">설명:</span> {schedule.description}
                        </p>
                      )}

                      {schedule.participants.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground">캐릭터:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {schedule.participants.map((participant, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 bg-primary/20 text-primary text-xs rounded"
                              >
                                {participant}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCompleted(schedule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.is_completed
                          ? 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                      }`}
                      title={schedule.is_completed ? '미완료로 변경' : '완료로 표시'}
                    >
                      {schedule.is_completed ? <X size={20} /> : <Check size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 폼 모달 */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-foreground">
                {editingSchedule ? '개인 스케줄 수정' : '새 개인 스케줄 추가'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="레이드 스케줄 제목을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="레이드 설명을 입력하세요"
                    rows={3}
                  />
                </div>

                {/* 레이드 선택 및 캐릭터 검색 */}
                <div className="border border-border rounded-lg p-4 bg-gray-900/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4">캐릭터 선택</h4>
                  <PersonalRaidSetup
                    selectedSlots={selectedSlots}
                    onSlotsChange={setSelectedSlots}
                    selectedRaid={selectedRaid}
                    onRaidChange={setSelectedRaid}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {editingSchedule ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}