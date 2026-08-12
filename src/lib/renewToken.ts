// Signed renewal links: `?t=<token>` identifies a member without requiring a
// login. HMAC over the member id with a server secret. Never verifiable in
// the browser (secret is server-only).
import crypto from 'crypto'

function secret() {
  return process.env.RENEW_LINK_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-only-secret'
}
function sig(id: string) {
  return crypto.createHmac('sha256', secret()).update(id).digest('base64url').slice(0, 24)
}

export function signMember(id: string) {
  return Buffer.from(id).toString('base64url') + '.' + sig(id)
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null
  const [b64, s] = token.split('.')
  if (!b64 || !s) return null
  let id: string
  try { id = Buffer.from(b64, 'base64url').toString('utf8') } catch { return null }
  const expected = sig(id)
  if (s.length !== expected.length) return null
  try {
    return crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)) ? id : null
  } catch { return null }
}
