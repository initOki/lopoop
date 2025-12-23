import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  try {
    console.log('Applying custom menus migration...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '001_create_custom_menus.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    // Execute each statement
    console.log('Migration statements to be executed via Supabase Dashboard SQL Editor:')
    console.log('=' .repeat(60))
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`\n-- Statement ${index + 1}:`)
        console.log(statement + ';')
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('Please copy and paste the above SQL into your Supabase Dashboard SQL Editor')
    console.log('Migration file location:', migrationPath)
    
    console.log('Migration SQL prepared successfully!')
    
    // Note: Tables verification will work after manual execution in Supabase Dashboard
    console.log('\nAfter applying the migration in Supabase Dashboard, you can verify with:')
    console.log('SELECT table_name FROM information_schema.tables WHERE table_name IN (\'custom_menus\', \'menu_members\');')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigration()
}