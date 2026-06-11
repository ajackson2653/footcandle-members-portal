import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rcjvdvyaqfpbqjunmqjf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_DUPpA49gmzLkJzv4bGNv6A_adAwJXFl'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Export createClient function for use in components
export function getSupabaseClient() {
  return supabase
}

// Development mode: use email/password until email service is configured
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { error }
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  return await supabase.auth.signOut()
}
