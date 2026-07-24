import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    if (!slug) {
      return new Response('Missing slug', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: row, error } = await admin
      .from('ugc_games')
      .select('html_path, status')
      .eq('slug', slug)
      .in('status', ['published', 'approved'])
      .maybeSingle()

    if (error || !row?.html_path) {
      return new Response('Not found', { status: 404, headers: corsHeaders })
    }

    const { data: file, error: dlError } = await admin.storage
      .from('ugc-games')
      .download(row.html_path)

    if (dlError || !file) {
      return new Response('Missing file', { status: 404, headers: corsHeaders })
    }

    const html = await file.text()
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(message, { status: 500, headers: corsHeaders })
  }
})
