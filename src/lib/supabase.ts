import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

console.log(import.meta.env.SUPABASE_KEY)

const supabaseUrl = 'https://lqouhidmuczumzrkpphc.supabase.co'
const supabaseKey =
  import.meta.env.SUPABASE_KEY ||
  'sb_publishable_QsGwzRKbB97AQDVltZgmNQ_nKqQGy-U'
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
