// Admin allow-list. Set NEXT_PUBLIC_ADMIN_EMAILS in Vercel to a comma-separated
// list of admin emails (e.g. "alan@footcandle.org,info@footcandle.org").
// If the list is empty (not configured yet), admin stays open to any logged-in
// user — same as before — so nobody gets locked out during setup.
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function isAdmin(email: string | null | undefined): boolean {
  if (ADMIN_EMAILS.length === 0) return true // not configured → open (setup grace)
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
