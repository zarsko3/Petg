import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ytambeoajiuacrfjcrvx.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseKey) {
  console.warn('⚠️ SUPABASE_KEY environment variable is not defined')
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'dummy-key-for-build')

// Export the configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  hasKey: !!supabaseKey,
  keyPrefix: supabaseKey?.substring(0, 10) + '...'
} 