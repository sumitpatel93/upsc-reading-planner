'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const TOPICS = [
  { id: 'all', label: '🗞️ All News', color: '#1e3a5f' },
  { id: 'Polity & Governance', label: '🏛️ Polity', color: '#2563eb' },
  { id: 'Economy', label: '💰 Economy', color: '#16a34a' },
  { id: 'International Relations', label: '🌍 IR', color: '#0e7490' },
  { id: 'Environment & Ecology', label: '🌿 Environment', color: '#15803d' },
  { id: 'Science & Technology', label: '🔬 Science & Tech', color: '#7e3af2' },
  { id: 'Geography & Disaster', label: '🗺️ Geography', color: '#b45309' },
  { id: 'History & Culture', label: '📜 History', color: '#9f1239' },
]

const SOURCE_COLORS: Record<string, string> = {
  'PIB': '#1d4ed8',
  'The Hindu': '#b91c1c',
  'Indian Express': '#0369a1',
}

export default function NewsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTopic, setActiveTopic] = useState('all')
  const [isPro, setIsPro] = useState(false)
  const [remaining, setRemaining] = useState(10)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (session) fetchNews('all')
  }, [session, status])

  async function fetchNews(topic: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/news?topic=' + encodeURIComponent(topic))
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setArticles(data.articles || [])
      setIsPro(data.isPro)
      setRemaining(data.remaining)
    } catch {
      setError('Failed to load news. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleTopicChange(topic: string) {
    setActiveTopic(topic)
    fetchNews(topic)
  }

  function timeAgo(dateStr: string) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return d + 'd ago'
    if (h > 0) return h + 'h ago'
    return 'Just now'
  }

  const topicInfo = TOPICS.find(t => t.id === activeTopic) || TOPICS[0]

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ fontSize: 16, color: '#64748b' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%)', color: 'white', padding: '20px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
              ← Back to Planner
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isPro
                ? <span style={{ background: '#16a34a', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>✦ Pro — Unlimited</span>
                : <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 99, fontSize: 12 }}>
                    {remaining} articles remaining today
                  </span>
              }
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>📰 UPSC News Digest</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
            PIB · The Hindu · Indian Express — filtered and summarised for UPSC
          </div>
        </div>
      </div>

      {/* Topic filters */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 4, padding: '10px 16px' }}>
          {TOPICS.map(t => (
            <button key={t.id} onClick={() => handleTopicChange(t.id)}
              style={{
                background: activeTopic === t.id ? t.color : 'transparent',
                color: activeTopic === t.id ? 'white' : '#475569',
                border: '1.5px solid ' + (activeTopic === t.id ? t.color : '#e2e8f0'),
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Free limit warning */}
        {!isPro && remaining <= 3 && remaining > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#78350f' }}>⚠️ Only {remaining} free articles left today</span>
            <button onClick={() => router.push('/pdf')}
              style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Upgrade for ₹49/month
            </button>
          </div>
        )}

        {!isPro && remaining === 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>Daily limit reached</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Free users can read 10 articles per day. Resets at midnight.</div>
            <button onClick={() => router.push('/pdf')}
              style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Upgrade to Pro — ₹49/month
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1.5px solid #e2e8f0', minHeight: 160 }}>
                <div style={{ background: '#f1f5f9', height: 12, borderRadius: 6, marginBottom: 10, width: '40%' }} />
                <div style={{ background: '#f1f5f9', height: 16, borderRadius: 6, marginBottom: 8 }} />
                <div style={{ background: '#f1f5f9', height: 16, borderRadius: 6, marginBottom: 8, width: '80%' }} />
                <div style={{ background: '#eff6ff', height: 12, borderRadius: 6, marginTop: 12, width: '90%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 15 }}>{error}</div>
            <button onClick={() => fetchNews(activeTopic)} style={{ marginTop: 12, background: '#2563eb', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )}

        {/* Articles grid */}
        {!loading && !error && articles.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, fontWeight: 600 }}>
              {articles.length} articles · {topicInfo.label} · Live from PIB, The Hindu, Indian Express
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {articles.map((article, i) => {
                const topicColor = TOPICS.find(t => t.id === article.topic)?.color || '#1e3a5f'
                const sourceColor = SOURCE_COLORS[article.source] || '#475569'
                return (
                  <a key={i} href={article.link} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      background: 'white', borderRadius: 12, border: '1.5px solid #e2e8f0',
                      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s', cursor: 'pointer', height: '100%',
                    }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                    >
                      {/* Topic bar */}
                      <div style={{ height: 4, background: topicColor }} />

                      <div style={{ padding: '14px 16px' }}>
                        {/* Meta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ background: sourceColor + '15', color: sourceColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: 0.5 }}>
                            {article.source}
                          </span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ background: topicColor + '15', color: topicColor, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                              {article.topic}
                            </span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{timeAgo(article.pubDate)}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, marginBottom: 8 }}>
                          {article.title}
                        </div>

                        {/* AI Summary */}
                        {article.upscSummary && (
                          <div style={{ background: '#eff6ff', borderLeft: '3px solid #2563eb', borderRadius: '0 8px 8px 0', padding: '8px 10px', marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              📚 UPSC Relevance
                            </div>
                            <div style={{ fontSize: 12, color: '#1e3a5f', lineHeight: 1.5 }}>
                              {article.upscSummary}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 10, fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                          Read full article →
                        </div>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No articles found for this topic</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try selecting a different topic or check back later</div>
          </div>
        )}
      </div>
    </div>
  )
}
