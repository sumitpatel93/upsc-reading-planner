'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { DEFAULTS } from '@/lib/defaults'

let idCounter = 2000
const newId = () => 'x' + (++idCounter)

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [easySpeed, setEasySpeed] = useState(20)
  const [denseSpeed, setDenseSpeed] = useState(12)
  const [hoursPerDay, setHoursPerDay] = useState(7)
  const [activeTab, setActiveTab] = useState('summary')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status])

  useEffect(() => {
    if (session) fetchPlan()
  }, [session])

  async function fetchPlan() {
    try {
      const res = await fetch('/api/plan')
      if (!res.ok) throw new Error()
      const plan = await res.json()
      setData(plan.papers || DEFAULTS)
      setEasySpeed(plan.easySpeed || 20)
      setDenseSpeed(plan.denseSpeed || 12)
      setHoursPerDay(plan.hoursPerDay || 7)
      setLastSaved(plan.updatedAt ? new Date(plan.updatedAt).toLocaleTimeString() : null)
    } catch {
      setData(JSON.parse(JSON.stringify(DEFAULTS)))
    } finally {
      setLoading(false)
    }
  }

  const savePlan = useCallback(async (planData: any[], es: number, ds: number, hpd: number) => {
    setSaving(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papers: planData, easySpeed: es, denseSpeed: ds, hoursPerDay: hpd }),
      })
      if (res.ok) {
        const j = await res.json()
        setLastSaved(new Date(j.updatedAt).toLocaleTimeString())
      }
    } finally {
      setSaving(false)
    }
  }, [])

  function debounceSave(d: any[], es: number, ds: number, hpd: number) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePlan(d, es, ds, hpd), 1500)
  }

  function updateData(newData: any[]) {
    setData(newData)
    debounceSave(newData, easySpeed, denseSpeed, hoursPerDay)
  }

  function updateSettings(es: number, ds: number, hpd: number) {
    setEasySpeed(es); setDenseSpeed(ds); setHoursPerDay(hpd)
    debounceSave(data, es, ds, hpd)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── CALCS ──────────────────────────────────────────────────────────────
  function getSpeed(dense: boolean) { return dense ? denseSpeed : easySpeed }
  function subjPages(s: any) { return s.books.reduce((t: number, b: any) => t + (parseInt(b.pages) || 0), 0) }
  function subjHours(s: any) { return subjPages(s) / getSpeed(s.dense) }
  function paperPages(p: any) { return p.subjects.reduce((t: number, s: any) => t + subjPages(s), 0) }
  function paperHours(p: any) { return p.subjects.reduce((t: number, s: any) => t + subjHours(s), 0) }
  function totalPages() { return data.reduce((t, p) => t + paperPages(p), 0) }
  function totalHours() { return data.reduce((t, p) => t + paperHours(p), 0) }

  // ── MUTATIONS ──────────────────────────────────────────────────────────
  function updatePages(pid: string, sid: string, bid: string, val: string) {
    const d = JSON.parse(JSON.stringify(data))
    const p = d.find((x: any) => x.id === pid)
    const s = p.subjects.find((x: any) => x.id === sid)
    const b = s.books.find((x: any) => x.id === bid)
    b.pages = parseInt(val) || 0
    updateData(d)
  }

  function deleteBook(pid: string, sid: string, bid: string) {
    const d = JSON.parse(JSON.stringify(data))
    const p = d.find((x: any) => x.id === pid)
    const s = p.subjects.find((x: any) => x.id === sid)
    s.books = s.books.filter((x: any) => x.id !== bid)
    updateData(d); showToast('Book removed')
  }

  function deleteSubject(pid: string, sid: string) {
    if (!confirm('Delete this subject and all its books?')) return
    const d = JSON.parse(JSON.stringify(data))
    const p = d.find((x: any) => x.id === pid)
    p.subjects = p.subjects.filter((x: any) => x.id !== sid)
    updateData(d); showToast('Subject removed')
  }

  function addBook(pid: string, sid: string) {
    const nameEl = document.getElementById(`bname-${sid}`) as HTMLInputElement
    const pagesEl = document.getElementById(`bpages-${sid}`) as HTMLInputElement
    const name = nameEl.value.trim()
    const pages = parseInt(pagesEl.value) || 0
    if (!name) { showToast('Enter a book name'); return }
    if (!pages) { showToast('Enter page count'); return }
    const d = JSON.parse(JSON.stringify(data))
    const p = d.find((x: any) => x.id === pid)
    const s = p.subjects.find((x: any) => x.id === sid)
    s.books.push({ id: newId(), name, pages })
    updateData(d); nameEl.value = ''; pagesEl.value = ''
    showToast('Book added ✓')
  }

  function addSubject(pid: string) {
    const nameEl = document.getElementById(`sname-${pid}`) as HTMLInputElement
    const denseEl = document.getElementById(`sdense-${pid}`) as HTMLSelectElement
    const name = nameEl.value.trim()
    if (!name) { showToast('Enter a subject name'); return }
    const d = JSON.parse(JSON.stringify(data))
    const p = d.find((x: any) => x.id === pid)
    p.subjects.push({ id: newId(), name, dense: denseEl.value === 'true', books: [] })
    updateData(d); nameEl.value = ''
    showToast('Subject added ✓')
  }

  function resetToDefaults() {
    if (!confirm('Reset to default books? Your custom books will be lost.')) return
    const fresh = JSON.parse(JSON.stringify(DEFAULTS))
    updateData(fresh); showToast('Reset to defaults ✓')
  }

  function printPlan() {
    const allExpanded: Record<string, boolean> = {}
    data.forEach(p => { allExpanded[p.id] = true })
    setExpanded(allExpanded)
    setTimeout(() => window.print(), 300)
  }

    function copyText() {
    const th = totalHours(), td = th / hoursPerDay
    let t = 'UPSC Reading Plan — ' + (session?.user?.name || '') + '\n' + '='.repeat(40) + '\n'
    t += 'Total: ' + Math.round(totalPages()).toLocaleString() + ' pages | ' + Math.round(th) + ' hours | ' + Math.round(td) + ' days\n\n'
    data.forEach(p => {
      t += p.paper + ': ' + paperPages(p) + 'p / ' + Math.round(paperHours(p)) + 'h / ' + Math.round(paperHours(p) / hoursPerDay) + ' days\n'
      p.subjects.forEach((s: any) => { t += '  • ' + s.name + ': ' + subjPages(s) + 'p\n' })
      t += '\n'
    })
    navigator.clipboard.writeText(t).then(() => showToast('Copied to clipboard ✓'))
  }

  if (status === 'loading' || loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>📚</div>
        <div style={{ fontSize:15, color:'#64748b' }}>Loading your plan...</div>
      </div>
    </div>
  )

  const th = totalHours(), td = th / hoursPerDay, tp = totalPages()

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#f8fafc', minHeight:'100vh' }}>

      {/* HERO */}
      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%)', color:'white', padding:'24px 20px 20px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          {/* Top bar */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }} className="no-print">
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:1, opacity:0.7, textTransform:'uppercase' }}>📚 UPSC Reading Planner</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {saving ? <span style={{ fontSize:11, opacity:0.7 }}>Saving...</span>
                : lastSaved ? <span style={{ fontSize:11, opacity:0.7 }}>Saved {lastSaved}</span> : null}
              <img src={session?.user?.image || ''} alt="" style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize:13, opacity:0.85 }}>{session?.user?.name?.split(' ')[0]}</span>
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'5px 12px', borderRadius:8, fontSize:12, cursor:'pointer' }}>
                Sign out
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { icon:'📄', val: Math.round(tp).toLocaleString(), label:'Total Pages' },
              { icon:'⏱️', val: Math.round(th).toLocaleString(), label:'Total Hours' },
              { icon:'📅', val: Math.round(td), label:'Study Days' },
              { icon:'📆', val: (td/30).toFixed(1), label:'Months' },
            ].map(c => (
              <div key={c.label} style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 16px', flex:'1 1 80px' }}>
                <div style={{ fontSize:18 }}>{c.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, lineHeight:1.1 }}>{c.val}</div>
                <div style={{ fontSize:10, opacity:0.65, textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SETTINGS BAR */}
      <div className="no-print" style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'12px 20px', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>Settings</span>
          {[
            { label:'Easy reading (pg/hr)', val:easySpeed, min:5, max:50, set:(v:number) => updateSettings(v, denseSpeed, hoursPerDay) },
            { label:'Dense notes (pg/hr)', val:denseSpeed, min:5, max:40, set:(v:number) => updateSettings(easySpeed, v, hoursPerDay) },
            { label:'Study hours/day', val:hoursPerDay, min:2, max:16, set:(v:number) => updateSettings(easySpeed, denseSpeed, v) },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, flex:'1 1 160px' }}>
              <span style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>{s.label}</span>
              <input type="range" min={s.min} max={s.max} value={s.val}
                onChange={e => s.set(Number(e.target.value))}
                style={{ width:80, accentColor:'#2563eb' }} />
              <span style={{ fontSize:14, fontWeight:700, color:'#2563eb', minWidth:24 }}>{s.val}</span>
            </div>
          ))}
          <button onClick={resetToDefaults} style={{ background:'none', border:'1.5px solid #e2e8f0', color:'#64748b', padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>↺ Reset</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px 60px' }}>

        {/* TABS + ACTIONS */}
        <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', borderBottom:'2px solid #e2e8f0' }}>
            {[['summary','📊 Summary'],['timeline','📅 Timeline'],['detail','✏️ Edit Books']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ background:'none', border:'none', padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
                  color: activeTab===id ? '#2563eb' : '#94a3b8',
                  borderBottom: activeTab===id ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom:-2, whiteSpace:'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={copyText} style={{ background:'white', border:'1.5px solid #e2e8f0', color:'#475569', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>📋 Copy</button>
            <button onClick={printPlan} style={{ background:'white', border:'1.5px solid #e2e8f0', color:'#475569', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>🖨️ Print / Save PDF</button>
            <button onClick={() => router.push('/pdf')}
              style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'white', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'none' }}>📖 PDF Reader</button>
            <button onClick={() => router.push('/news')}
              style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f)', color:'white', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'none' }}>📰 News</button>
          </div>
        </div>

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14 }}>
            {data.map(p => {
              const pp = paperPages(p), ph = paperHours(p), pd = ph / hoursPerDay
              const pct = Math.round(pp / (tp || 1) * 100)
              return (
                <div key={p.id} style={{ background:'white', borderRadius:14, border:`1.5px solid ${p.color}22`, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                  <div style={{ background:p.color, padding:'12px 16px', color:'white' }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>{p.paper}</div>
                    <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{pct}% of total load</div>
                  </div>
                  <div style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-around', marginBottom:10 }}>
                      {[['📄',pp.toLocaleString(),'Pages'],['⏱️',Math.round(ph),'Hours'],['📅',Math.round(pd),'Days']].map(([ico,val,lbl]) => (
                        <div key={String(lbl)} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:18, fontWeight:800, color:p.color }}>{val}</div>
                          <div style={{ fontSize:10, color:'#94a3b8' }}>{ico} {lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:'#f1f5f9', borderRadius:99, height:6, overflow:'hidden', marginBottom:10 }}>
                      <div style={{ width:`${pct}%`, background:p.color, height:'100%', borderRadius:99 }} />
                    </div>
                    {p.subjects.map((s: any) => (
                      <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                        <span style={{ color:'#374151' }}>• {s.name}</span>
                        <span style={{ color:'#94a3b8', whiteSpace:'nowrap', marginLeft:8 }}>{subjPages(s)}p / {Math.round(subjHours(s))}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10, marginBottom:16 }}>
              {data.map(p => {
                const pd = paperHours(p) / hoursPerDay
                return (
                  <div key={p.id} style={{ background:p.light, borderLeft:`4px solid ${p.color}`, borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:p.color }}>{p.paper}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginTop:2 }}>{Math.round(pd)}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>days · {(pd/7).toFixed(1)} weeks</div>
                  </div>
                )
              })}
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:'14px 18px', fontSize:13, color:'#78350f', lineHeight:1.6 }}>
              ⚡ <strong>Total first reading: ~{Math.round(td)} days ({(td/30).toFixed(1)} months)</strong> at {hoursPerDay}h/day.
              This is <em>first reading only</em> — budget equal time again for revision + answer writing practice.
            </div>
          </div>
        )}

        {/* DETAIL TAB */}
        {activeTab === 'detail' && (
          <div>
            {data.map((p, pi) => (
              <div key={p.id} style={{ background:'white', borderRadius:14, border:'1.5px solid #e2e8f0', overflow:'hidden', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                <div onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                  style={{ background:p.color, padding:'12px 18px', color:'white', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{p.paper}</div>
                    <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>{paperPages(p).toLocaleString()} pages · {Math.round(paperHours(p))} hrs · {Math.round(paperHours(p)/hoursPerDay)} days</div>
                  </div>
                  <span style={{ fontSize:14 }}>{expanded[p.id] ? '▲' : '▼'}</span>
                </div>

                {expanded[p.id] && (
                  <div style={{ padding:'14px 16px' }}>
                    {p.subjects.map((s: any) => (
                      <div key={s.id} style={{ marginBottom:14, paddingBottom:14, borderBottom:'2px dashed #f1f5f9' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:p.color }}>{s.name} — {subjPages(s)}p / {Math.round(subjHours(s))}h</span>
                          <button onClick={() => deleteSubject(p.id, s.id)} className="no-print"
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#94a3b8', padding:'2px 6px' }}>✕ subject</button>
                        </div>

                        {s.books.map((b: any) => (
                          <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 72px 50px 30px', gap:8, padding:'5px 0', borderBottom:'1px solid #f8fafc', alignItems:'center' }}>
                            <span style={{ fontSize:12, color:'#374151' }}>{b.name}</span>
                            <input type="number" value={b.pages} min={0}
                              onChange={e => updatePages(p.id, s.id, b.id, e.target.value)}
                              style={{ padding:'4px 6px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:12, fontWeight:600, textAlign:'center', width:'100%' }} />
                            <span style={{ fontSize:11, color:'#64748b' }}>{(b.pages / getSpeed(s.dense)).toFixed(1)}h</span>
                            <button onClick={() => deleteBook(p.id, s.id, b.id)} className="no-print"
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1 }}>✕</button>
                          </div>
                        ))}

                        {/* Add book */}
                        <div className="no-print" style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                          <input id={`bname-${s.id}`} type="text" placeholder="Book name"
                            style={{ flex:'1 1 140px', padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12 }} />
                          <input id={`bpages-${s.id}`} type="number" placeholder="Pages"
                            style={{ width:72, padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, textAlign:'center' }} />
                          <button onClick={() => addBook(p.id, s.id)}
                            style={{ background:'#2563eb', color:'white', border:'none', padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Book</button>
                        </div>
                      </div>
                    ))}

                    {/* Add subject */}
                    <div className="no-print" style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
                      <input id={`sname-${p.id}`} type="text" placeholder="New subject name"
                        style={{ flex:'1 1 160px', padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12 }} />
                      <select id={`sdense-${p.id}`}
                        style={{ padding:'6px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12 }}>
                        <option value="true">Dense</option>
                        <option value="false">Easy</option>
                      </select>
                      <button onClick={() => addSubject(p.id)}
                        style={{ background:'white', border:'1.5px solid #e2e8f0', color:'#475569', padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Subject</button>
                    </div>

                    <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px', marginTop:12, fontSize:13, fontWeight:600, color:p.color }}>
                      Total: {paperPages(p).toLocaleString()} pages → {Math.round(paperHours(p))} hours → {Math.round(paperHours(p)/hoursPerDay)} days
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#0f172a', color:'white', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      <div className="no-print" style={{ textAlign:'center', padding:'20px', fontSize:12, color:'#94a3b8', borderTop:'1px solid #e2e8f0' }}>
        Built for UPSC aspirants · Your data is saved to your account · <a href="https://github.com/sumitpatel93/upsc-reading-planner" style={{ color:'#2563eb', textDecoration:'none' }}>GitHub</a>
      </div>
    </div>
  )
}