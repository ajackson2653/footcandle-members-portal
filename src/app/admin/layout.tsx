'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

// Gate for the whole /admin/* area. Non-admins are sent to their dashboard;
// signed-out visitors to login. (Server API routes enforce the same check —
// this is the UI half.)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      if (!isAdmin(user.email)) { window.location.href = '/dashboard'; return }
      setOk(true)
    })()
  }, [])

  if (ok === null) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 18 }}>Loading…</div>
  }
  return <>{children}</>
}
