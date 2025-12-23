import { readFileSync } from 'fs'
import { join } from 'path'
import { supabase } from '../src/lib/supabase'

async function applyPersonalMigration() {
  try {
    console.log('개인 테이블 마이그레이션을 시작합니다...')
    
    // 마이그레이션 파일 읽기
    const migrationPath = join(process.cwd(), 'migrations', '003_create_personal_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // SQL 실행
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('마이그레이션 실행 중 오류 발생:', error)
      process.exit(1)
    }
    
    console.log('✅ 개인 테이블 마이그레이션이 성공적으로 완료되었습니다!')
    console.log('생성된 테이블:')
    console.log('- personal_debts (개인 빚 관리)')
    console.log('- personal_schedules (개인 스케줄 관리)')
    console.log('- 관련 인덱스 및 RLS 정책')
    
  } catch (error) {
    console.error('마이그레이션 실행 중 예상치 못한 오류:', error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  applyPersonalMigration()
}