'use client'
import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'sumit.patel93@gmail.com'

function StatCard({ label, value, sub, color }: { label: string; value: any; sub?: string; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', border: '1.5px solid #e2e8f0', borderLeft: '4px solid ' + color }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activatingPro, setActivatingPro] = useState('')
  const [toast, setToast] = useState('')

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    if (!isAdmin) return
    fetchStats()
  }, [session, status])

  async function fetchStats() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin')
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setData(d)
    } catch {
      setError('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  async function activatePro(email: string) {
    setActivatingPro(email)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_pro', targetEmail: email, days: 30 })
      })
      const d = await res.json()
      if (d.ok) { showToast('Pro activated for ' + email); fetchStats() }
    } finally {
      setActivatingPro('')
    }
  }

  async function revokePro(email: string) {
    if (!confirm('Revoke Pro for ' + email + '?')) return
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_pro', targetEmail: email })
    })
    const d = await res.json()
    if (d.ok) { showToast('Pro revoked for ' + email); fetchStats() }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function timeAgo(dateStr: string) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return d + 'd ago'
    if (h > 0) return h + 'h ago'
    if (m > 0) return m + 'm ago'
    return 'Just now'
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Not logged in
  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ color: 'white', fontSize: 16 }}>Loading...</div>
    </div>
  )

  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '48px 40px', textAlign: 'center', maxWidth: 380, border: '1px solid #334155' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>Admin Panel</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>UPSC Reading Planner · Restricted Access</div>
        <button onClick={() => signIn('google')}
          style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '48px 40px', textAlign: 'center', border: '1px solid #334155' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>Access Denied</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Logged in as {session.user?.email}</div>
        <button onClick={() => signIn('google')} style={{ marginTop: 20, padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Sign in with admin account
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#0f172a', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>⚙️ Admin Panel</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>UPSC Reading Planner · {session.user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchStats} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
            ← App
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading stats...</div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626', marginBottom: 20 }}>{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
              <StatCard label="Total Users" value={data.stats.totalUsers} sub="All time signups" color="#2563eb" />
              <StatCard label="Today" value={data.stats.todaySignups} sub="New signups" color="#16a34a" />
              <StatCard label="This Week" value={data.stats.weekSignups} sub="Last 7 days" color="#0e7490" />
              <StatCard label="This Month" value={data.stats.monthSignups} sub="Current month" color="#7e3af2" />
              <StatCard label="Pro Users" value={data.stats.totalPro} sub="Active subscriptions" color="#ea580c" />
              <StatCard label="PDF Uploads" value={data.stats.totalPdfUploads} sub="Total across users" color="#0369a1" />
              <StatCard label="News Read" value={data.stats.totalNewsRead} sub="Total articles" color="#15803d" />
            </div>

            {/* Pro Users */}
            {data.proUsers.length > 0 && (
              <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ background: '#fffbeb', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>✦ Pro Users ({data.proUsers.length})</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Name', 'Email', 'Expires', 'Order ID', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.proUsers.map((u: any, i: number) => (
                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name || '—'}</td>
                          <td style={{ padding: '12px 16px', color: '#2563eb' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: new Date(u.expiry) < new Date() ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                            {formatDate(u.expiry)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11 }}>{u.orderId?.substring(0, 20) || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => revokePro(u.email)}
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Signups */}
            <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>👥 Recent Users (last 20)</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Name', 'Email', 'Joined', 'Pro', 'PDFs', 'News', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSignups.map((u: any, i: number) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#2563eb' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                          {formatDate(u.joinedAt)}
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{timeAgo(u.joinedAt)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.isPro
                            ? <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✦ Pro</span>
                            : <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>Free</span>
                          }
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{u.pdfCount}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{u.newsRead}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {!u.isPro && (
                            <button onClick={() => activatePro(u.email)} disabled={activatingPro === u.email}
                              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              {activatingPro === u.email ? '...' : '+ Pro'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
