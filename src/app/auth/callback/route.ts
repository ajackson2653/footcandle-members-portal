import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rcjvdvyaqfpbqjunmqjf.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DUPpA49gmzLkJzv4bGNv6A_adAwJXFl'
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
