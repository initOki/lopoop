import { readFileSync } from 'fs'
import { join } from 'path'
import { supabase } from '../src/lib/supabase'

async function applyMenuTypeMigration() {
  try {
    console.log('개인 메뉴 타입 마이그레이션을 시작합니다...')
    
    // 마이그레이션 파일 읽기
    const migrationPath = join(process.cwd(), 'migrations', '004_add_personal_menu_type.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // SQL 실행
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('마이그레이션 실행 중 오류 발생:', error)
      process.exit(1)
    }
    
    console.log('✅ 개인 메뉴 타입 마이그레이션이 성공적으로 완료되었습니다!')
    console.log('이제 "personal" 타입의 메뉴를 생성할 수 있습니다.')
    
  } catch (error) {
    console.error('마이그레이션 실행 중 예상치 못한 오류:', error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  applyMenuTypeMigration()
}