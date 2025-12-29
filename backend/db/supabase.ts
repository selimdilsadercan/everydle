import { createClient } from '@supabase/supabase-js'
import { secret } from 'encore.dev/config'

const supabaseUrl = secret("SupabaseUrl")
const supabaseKey = secret("SupabaseKey")

export const supabase = createClient(supabaseUrl(), supabaseKey())
