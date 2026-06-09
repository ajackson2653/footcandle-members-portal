'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/supabase'
import Link from 'next/link'
import { LogOut, Film, Mail, Bell, Inbox } from 'lucide-react'

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      // For now, any logged-in user can access admin
      // TODO: Add proper admin role checking
      if (!currentUser) {
        window.location.href = '/'
      } else {
        setUser(currentUser)
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) return <div style={styles.loading}>Loading...</div>

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Admin Dashboard</h1>
        <button
          onClick={() => {
            signOut()
            window.location.href = '/'
          }}
          style={styles.logoutBtn}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          <Link href="/admin/film-screenings" style={styles.card}>
            <Film size={32} />
            <h2>Film Screenings</h2>
            <p>Create monthly film announcements</p>
          </Link>

          <Link href="/admin/renewal-reminders" style={styles.card}>
            <Mail size={32} />
            <h2>Renewal Reminders</h2>
            <p>Send renewal emails to expired members</p>
          </Link>

          <Link href="/admin/announcements" style={styles.card}>
            <Bell size={32} />
            <h2>General Announcements</h2>
            <p>Post general updates and news</p>
          </Link>

          <Link href="/admin/email-queue" style={styles.card}>
            <Inbox size={32} />
            <h2>Email Queue</h2>
            <p>View drafted and sent emails</p>
          </Link>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  main: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '0 20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: '#1f2937',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#6b7280'
  }
}
