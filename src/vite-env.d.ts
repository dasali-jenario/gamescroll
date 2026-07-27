/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Optional n8n (or other) webhook; preferred over Supabase insert when set. */
  readonly VITE_TELEMETRY_WEBHOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_ID__: string
