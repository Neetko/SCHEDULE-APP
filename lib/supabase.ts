import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Database types
export interface ScheduleEntry {
  id?: number
  date: string
  time_slot: string
  status: "free" | "busy"
  activity: string
  description: string
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  email?: string
  name?: string
  username?: string
  discriminator?: string
  avatar?: string
  image?: string
  last_login?: string
  created_at?: string
}
