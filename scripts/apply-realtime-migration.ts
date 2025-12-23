import { supabase } from '../src/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyRealtimeMigration() {
  try {
    console.log('실시간 기능 및 RLS 마이그레이션을 적용합니다...')
    
    const migrationPath = join(process.cwd(), 'migrations', '005_enable_realtime_and_rls.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    const { error } = await supabase.rpc('exec', { sql: migrationSQL })
    
    if (error) {
      console.error('마이그레이션 적용 중 오류 발생:', error)
      process.exit(1)
    }
    
    console.log('✅ 실시간 기능 및 RLS 마이그레이션이 성공적으로 적용되었습니다!')
    
    // 연결 종료
    process.exit(0)
  } catch (error) {
    console.error('마이그레이션 적용 중 예상치 못한 오류:', error)
    process.exit(1)
  }
}

applyRealtimeMigration()