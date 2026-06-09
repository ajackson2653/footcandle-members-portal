'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'

interface Email {
  id: string
  email_type: string
  subject: string
  status: string
  created_at: string
  metadata?: any
}

export default function EmailQueueAdmin() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmails(data || [])
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (id: string) => {
    try {
      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id)

      setMessage('✓ Email marked as sent (actual sending requires email service)')
      loadEmails()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('email_queue').delete().eq('id', id)
      loadEmails()
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading) return <div style={styles.loading}>Loading emails...</div>

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/admin" style={styles.backLink}>
          <ArrowLeft size={20} />
          Back to Admin
        </Link>
        <h1>Email Queue</h1>
        <div style={{ width: '120px' }} />
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          {message && (
            <div style={{
              ...styles.message,
              background: message.includes('Error') ? '#fee2e2' : '#d1fae5',
              color: message.includes('Error') ? '#7f1d1d' : '#065f46'
            }}>
              {message}
            </div>
          )}

          {emails.length === 0 ? (
            <p style={styles.noData}>No emails in queue</p>
          ) : (
            <div style={styles.emailsList}>
              {emails.map(email => (
                <div key={email.id} style={styles.emailItem}>
                  <div style={styles.emailContent}>
                    <p style={styles.emailType}>{email.email_type}</p>
                    <p style={styles.emailSubject}>{email.subject}</p>
                    <p style={styles.emailDate}>
                      {new Date(email.created_at).toLocaleDateString()} 
                      • Status: <strong>{email.status}</strong>
                    </p>
                  </div>
                  <div style={styles.emailActions}>
                    {email.status === 'draft' && (
                      <button
                        onClick={() => handleSend(email.id)}
                        style={styles.sendBtn}
                      >
                        <Send size={16} />
                        Send
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(email.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  emailsList: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px'
  },
  emailItem: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  emailContent: {
    flex: 1
  },
  emailType: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const
  },
  emailSubject: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '4px'
  },
  emailDate: {
    fontSize: '13px',
    color: '#6b7280'
  },
  emailActions: {
    display: 'flex',
    gap: '8px'
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  deleteBtn: {
    padding: '8px 12px',
    background: '#fee2e2',
    color: '#7f1d1d',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  }
}
