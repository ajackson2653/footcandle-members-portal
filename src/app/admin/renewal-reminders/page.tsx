'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'

interface ExpiredMember {
  id: string
  full_name: string
  email: string
  renewal_date: string
  days_expired: number
}

export default function RenewalRemindersAdmin() {
  const [expiredMembers, setExpiredMembers] = useState<ExpiredMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  useEffect(() => {
    const loadExpiredMembers = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('members')
          .select('id, full_name, email, renewal_date, status')
          .lt('renewal_date', today)
          .order('renewal_date', { ascending: false })

        if (error) throw error

        const formatted = data?.map(m => ({
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          renewal_date: m.renewal_date,
          days_expired: Math.floor((Date.now() - new Date(m.renewal_date).getTime()) / (1000 * 60 * 60 * 24))
        })) || []

        setExpiredMembers(formatted)
      } catch (err) {
        setMessage(`Error loading members: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadExpiredMembers()
  }, [])

  const toggleMember = (id: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedMembers(newSelected)
  }

  const toggleAllMembers = () => {
    if (selectedMembers.size === expiredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(expiredMembers.map(m => m.id)))
    }
  }

  const handleSend = async () => {
    if (selectedMembers.size === 0) {
      setMessage('Please select at least one member')
      return
    }

    setSending(true)
    try {
      const selectedEmails = expiredMembers
        .filter(m => selectedMembers.has(m.id))
        .map(m => m.email)
        .join(', ')

      const emailBody = customMessage || `Your Footcandle Film Society membership has expired. Please renew your membership to continue enjoying our monthly film screenings. Click below to renew: https://footcandlemembers.eventive.org/subscriptions`

      const { error } = await supabase
        .from('email_queue')
        .insert({
          email_type: 'renewal_reminder',
          recipient_email: selectedEmails,
          recipient_filter: 'specific_list',
          subject: 'Renew Your Footcandle Film Society Membership',
          body: emailBody,
          status: 'draft',
          metadata: {
            recipient_count: selectedMembers.size
          }
        })

      if (error) throw error

      setMessage(`✓ Renewal reminder drafted for ${selectedMembers.size} member(s). Check Email Queue to review and send.`)
      setSelectedMembers(new Set())
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading expired members...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/admin" style={styles.backLink}>
          <ArrowLeft size={20} />
          Back to Admin
        </Link>
        <h1>Send Renewal Reminders</h1>
        <div style={{ width: '120px' }} />
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2>Expired Members ({expiredMembers.length})</h2>
          <p style={styles.subtitle}>
            Select members to send renewal reminder emails
          </p>

          {expiredMembers.length === 0 ? (
            <p style={styles.noData}>No expired members at this time.</p>
          ) : (
            <>
              <div style={styles.controls}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.size === expiredMembers.length}
                    onChange={toggleAllMembers}
                  />
                  Select All ({expiredMembers.length})
                </label>
                <p style={styles.selectedCount}>
                  {selectedMembers.size} selected
                </p>
              </div>

              <div style={styles.membersList}>
                {expiredMembers.map(member => (
                  <div key={member.id} style={styles.memberItem}>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => toggleMember(member.id)}
                      />
                      <div>
                        <p style={styles.memberName}>{member.full_name}</p>
                        <p style={styles.memberEmail}>{member.email}</p>
                        <p style={styles.memberStatus}>
                          Expired {member.days_expired} days ago
                        </p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Custom Message (Optional)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Default: Standard renewal reminder. Leave blank to use default message."
                  rows={5}
                  style={styles.textarea}
                />
                <p style={styles.helperText}>
                  Default message includes renewal link to Eventive
                </p>
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
                onClick={handleSend}
                disabled={sending || selectedMembers.size === 0}
                style={{
                  ...styles.sendBtn,
                  opacity: (sending || selectedMembers.size === 0) ? 0.6 : 1
                }}
              >
                <Send size={16} />
                {sending ? 'Drafting...' : `Draft Reminder for ${selectedMembers.size} Member${selectedMembers.size !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>

        <div style={styles.infoCard}>
          <h3>How It Works</h3>
          <p>
            <strong>On-Demand Reminders:</strong> Select members above and click "Draft Reminder". 
            The email is saved as a draft in the Email Queue where you can review and send whenever you're ready.
          </p>
          <p style={{ marginTop: '12px' }}>
            <strong>Automatic Reminders:</strong> Coming soon — system will automatically send reminders when memberships expire.
          </p>
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
  main: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '0 20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: '24px'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f3f4f6',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  selectedCount: {
    color: '#6b7280',
    fontSize: '14px'
  },
  membersList: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    maxHeight: '400px',
    overflowY: 'auto' as const
  },
  memberItem: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb'
  },
  memberName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  },
  memberEmail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  memberStatus: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px'
  },
  formGroup: {
    marginTop: '24px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1f2937'
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
  helperText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px'
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    marginTop: '24px'
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  infoCard: {
    background: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    borderLeft: '4px solid #3b82f6'
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic'
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
