// Non-secret Supabase project URL + publishable (anon) key. These are safe to
// ship in the bundle (they're the same values the browser client uses) and are
// used by server routes. Fall back to the known project values so a missing
// Vercel env var can't break API routes.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rcjvdvyaqfpbqjunmqjf.supabase.co'
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DUPpA49gmzLkJzv4bGNv6A_adAwJXFl'
