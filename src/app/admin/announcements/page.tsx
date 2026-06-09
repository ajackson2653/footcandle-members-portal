'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'

export default function AnnouncementsAdmin() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('admin_notes')
        .insert({
          body: `${title}\n\n${body}`,
          audience: 'all',
          announcement_type: 'general',
          published: true,
          priority: 0
        })

      if (error) throw error

      setMessage('✓ Announcement posted successfully!')
      setTitle('')
      setBody('')
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/admin" style={styles.backLink}>
          <ArrowLeft size={20} />
          Back to Admin
        </Link>
        <h1>General Announcements</h1>
        <div style={{ width: '120px' }} />
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Your announcement..."
                rows={6}
                required
                style={styles.textarea}
              />
            </div>

            {message && (
              <div style={{
                ...styles.message,
                background: message.includes('Error') ? '#fee2e2' : '#d1fae5',
                color: message.includes('Error') ? '#7f1d1d' : '#065f46'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !body}
              style={{
                ...styles.submitBtn,
                opacity: (loading || !body) ? 0.6 : 1
              }}
            >
              <Send size={16} />
              {loading ? 'Posting...' : 'Post Announcement'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#f9fafb' },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'white',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  main: { maxWidth: '900px', margin: '40px auto', padding: '0 20px' },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formGroup: { marginBottom: '24px' },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600' as const,
    marginBottom: '8px',
    color: '#1f2937'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    fontResize: 'vertical' as const
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer'
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px'
  }
}
