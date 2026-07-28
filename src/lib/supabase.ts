import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export type UgcStatus = 'draft' | 'published' | 'approved' | 'rejected'

/** official = Gamescroll catalog; user = community creator */
export type UgcSource = 'official' | 'user'

export type UgcGameRow = {
  id: string
  creator_id: string | null
  slug: string
  title: string
  tip: string
  accent: string
  status: UgcStatus
  source: UgcSource
  html_path: string
  html_url: string | null
  brief: Record<string, unknown> | null
  conversation?: unknown
  created_at: string
  updated_at: string
  published_at: string | null
  approved_at: string | null
  rejection_note: string | null
  /** Qualified play engagements (≥10s). */
  plays?: number
  /** Unique devices/players with ≥1 qualified play. */
  players?: number
}
