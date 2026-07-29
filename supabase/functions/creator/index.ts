import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleChatTurn } from '../_shared/chatTurn.ts'
import { handleLayoutFix } from '../_shared/layoutFix.ts'
import { handleModerate, handlePublish } from '../_shared/publishDraft.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const libBase =
      Deno.env.get('PUBLIC_SITE_URL') || 'https://play.thehappylab.com'

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = (await req.json()) as Record<string, unknown>
    const action = body.action as string

    if (action === 'chat') {
      return await handleChatTurn({
        admin,
        userId: user.id,
        body,
        libBase,
        supabaseUrl,
        jsonResponse,
      })
    }

    if (action === 'layout_fix') {
      return await handleLayoutFix({
        admin,
        userId: user.id,
        body,
        libBase,
        jsonResponse,
      })
    }

    if (action === 'publish') {
      return await handlePublish({
        admin,
        userId: user.id,
        body,
        jsonResponse,
      })
    }

    if (action === 'moderate') {
      return await handleModerate({
        admin,
        userId: user.id,
        body,
        jsonResponse,
      })
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
