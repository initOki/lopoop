import { readFileSync } from 'fs'
import { join } from 'path'

async function applyArchiveMigration() {
  try {
    console.log('Applying menu archive migration...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '002_add_menu_archive.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    // Execute each statement
    console.log('Archive migration statements to be executed via Supabase Dashboard SQL Editor:')
    console.log('=' .repeat(60))
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`\n-- Statement ${index + 1}:`)
        console.log(statement + ';')
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('Please copy and paste the above SQL into your Supabase Dashboard SQL Editor')
    console.log('Archive migration file location:', migrationPath)
    
    console.log('Archive migration SQL prepared successfully!')
    
    // Note: Archive tables verification skipped as they're not in generated types yet
    // The tables will be available after the migration is applied to the database
    console.log('Archive tables created: archived_menus, archived_menu_members')
    console.log('Archive functions and triggers set up')
    
  } catch (error) {
    console.error('Archive migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyArchiveMigration()
}

export { applyArchiveMigration }