'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export default function PDFReader() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [books, setBooks] = useState<any[]>([])
  const [activeBook, setActiveBook] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [readingSession, setReadingSession] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (session) fetchBooks()
  }, [session, status])

  async function fetchBooks() {
    const res = await fetch('/api/pdf')
    const d = await res.json()
    setBooks(d.pdfBooks || [])
  }

  async function uploadPDF(e: any) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check 1: file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Only PDF files are allowed')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Check 2: MIME type
    if (file.type !== 'application/pdf' && file.type !== '') {
      showToast('Only PDF files are allowed')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Check 3: magic bytes — real PDFs start with %PDF
    const header = await file.slice(0, 4).arrayBuffer()
    const magic = new Uint8Array(header)
    const isPDF = magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46
    if (!isPDF) {
      showToast('This file is not a valid PDF')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) { showToast('PDF must be under 10MB'); return }
    setUploading(true)
    try {
      // Auto-detect page count using PDF.js before uploading
      const name = file.name.replace(/\.pdf$/i, '')
      let pages = 0
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        pages = pdf.numPages
      } catch {
        // fallback: estimate from file size (avg ~50KB per page)
        pages = Math.max(1, Math.round(file.size / 51200))
      }

      // Upload to Cloudinary
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', UPLOAD_PRESET || 'upsc_unsigned')
      fd.append('resource_type', 'raw')
      const res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/raw/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed')

      await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_pdf', data: { name, pdfUrl: data.secure_url, totalPages: pages } })
      })
      await fetchBooks()
      showToast('PDF uploaded — ' + pages + ' pages detected ✓')
    } catch (err: any) {
      showToast('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function startReading(book: any) {
    setActiveBook(book)
    setReadingSession({ startTime: Date.now(), startPage: book.pagesRead || 0, currentPage: book.pagesRead || 0, speed: 0 })
    timerRef.current = setInterval(() => {
      setReadingSession((s: any) => {
        if (!s) return s
        const mins = (Date.now() - s.startTime) / 60000
        const pagesRead = s.currentPage - s.startPage
        const speed = mins > 0.1 ? Math.round((pagesRead / mins) * 60) : 0
        return { ...s, speed, elapsed: Math.floor((Date.now() - s.startTime) / 1000) }
      })
    }, 5000)
  }

  async function stopReading() {
    clearInterval(timerRef.current)
    if (!readingSession || !activeBook) return
    const duration = Math.round((Date.now() - readingSession.startTime) / 60000)
    await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_session',
        data: { bookId: activeBook.id, pagesRead: readingSession.currentPage, duration, speed: readingSession.speed }
      })
    })
    await fetchBooks()
    setActiveBook(null)
    setReadingSession(null)
    showToast(`Session saved! Speed: ~${readingSession.speed} pages/hr`)
  }

  async function deleteBook(id: string) {
    if (!confirm('Delete this PDF?')) return
    await fetch('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_pdf', bookId: id }) })
    await fetchBooks()
    showToast('Deleted')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${s.toString().padStart(2,'0')}`
  }

  if (status === 'loading') return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontSize:16,color:'#64748b'}}>Loading...</div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:'#f8fafc',minHeight:'100vh'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%)',color:'white',padding:'20px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <button onClick={() => router.push('/dashboard')} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'white',padding:'5px 12px',borderRadius:8,fontSize:12,cursor:'pointer',marginBottom:8}}>← Back to Planner</button>
            <div style={{fontSize:22,fontWeight:800}}>📖 PDF Reader & Speed Tracker</div>
            <div style={{fontSize:13,opacity:0.75,marginTop:4}}>Upload your study books · Track your reading speed · Auto-update your plan</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,opacity:0.6}}>Logged in as</div>
            <div style={{fontSize:13,fontWeight:600}}>{session?.user?.name}</div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 16px'}}>

        {/* Active Reading Session */}
        {activeBook && readingSession && (
          <div style={{background:'#0f172a',color:'white',borderRadius:16,padding:'20px 24px',marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div>
                <div style={{fontSize:11,opacity:0.6,textTransform:'uppercase',letterSpacing:1}}>Now Reading</div>
                <div style={{fontSize:18,fontWeight:800,marginTop:4}}>{activeBook.name}</div>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                {[
                  ['⏱️', formatTime(readingSession.elapsed || 0), 'Time'],
                  ['📄', readingSession.currentPage, 'Page'],
                  ['⚡', `${readingSession.speed || 0}`, 'Pages/hr'],
                ].map(([icon, val, label]) => (
                  <div key={String(label)} style={{textAlign:'center',background:'rgba(255,255,255,0.1)',padding:'10px 16px',borderRadius:10}}>
                    <div style={{fontSize:20,fontWeight:800}}>{val}</div>
                    <div style={{fontSize:10,opacity:0.7}}>{icon} {label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Page input */}
            <div style={{marginTop:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              <label style={{fontSize:13,opacity:0.8}}>Current page:</label>
              <input type="number" value={readingSession.currentPage} min={0} max={activeBook.totalPages}
                onChange={e => setReadingSession((s: any) => ({...s, currentPage: parseInt(e.target.value)||0}))}
                style={{width:80,padding:'6px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'white',fontSize:14,fontWeight:700,textAlign:'center'}} />
              <span style={{fontSize:13,opacity:0.6}}>of {activeBook.totalPages}</span>

              <div style={{flex:1,background:'rgba(255,255,255,0.1)',borderRadius:99,height:8,overflow:'hidden',minWidth:100}}>
                <div style={{width:`${Math.min(100,(readingSession.currentPage/activeBook.totalPages)*100)}%`,background:'#60a5fa',height:'100%',borderRadius:99,transition:'width 0.3s'}} />
              </div>

              <button onClick={stopReading}
                style={{background:'#ef4444',border:'none',color:'white',padding:'8px 20px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                ⏹ Stop & Save
              </button>
            </div>

            {/* PDF iframe */}
            <div style={{marginTop:16,borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)'}}>
              <iframe src={`${activeBook.pdfUrl}#toolbar=1&navpanes=1`} width="100%" height="600px" style={{display:'block',background:'white'}} />
            </div>
          </div>
        )}

        {/* Upload section */}
        <div style={{background:'white',borderRadius:14,border:'2px dashed #cbd5e1',padding:'24px',marginBottom:20,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>📤</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>Upload a PDF Book</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>PDFs are stored securely on Cloudinary — not in the database. Max 10MB per file.</div>
          <div style={{fontSize:11,color:'#94a3b8',marginBottom:16,padding:'8px',background:'#fffbeb',borderRadius:8,border:'1px solid #fcd34d'}}>
            ⚠️ Only upload PDFs you own or have rights to use. Don't upload copyrighted books without permission.
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={uploadPDF} style={{display:'none'}} id="pdfInput" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{background: uploading ? '#94a3b8' : '#2563eb',color:'white',border:'none',padding:'12px 28px',borderRadius:10,fontSize:14,fontWeight:700,cursor: uploading ? 'not-allowed' : 'pointer'}}>
            {uploading ? '⏳ Uploading...' : '+ Upload PDF'}
          </button>
        </div>

        {/* Book list */}
        {books.length > 0 && (
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Your PDF Books ({books.length})</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {books.map((book: any) => {
                const pct = Math.round((book.pagesRead / book.totalPages) * 100)
                const sessions = book.sessions || []
                const avgSpeed = sessions.length > 0 ? Math.round(sessions.reduce((s: number, r: any) => s + r.speed, 0) / sessions.length) : 0
                const remaining = book.totalPages - book.pagesRead
                const eta = avgSpeed > 0 ? Math.round(remaining / avgSpeed * 10) / 10 : null
                return (
                  <div key={book.id} style={{background:'white',borderRadius:12,border:'1.5px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                    <div style={{background:'linear-gradient(135deg,#1e3a5f,#2563eb)',padding:'12px 14px',color:'white'}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{book.name}</div>
                      <div style={{fontSize:11,opacity:0.8}}>{book.totalPages} pages total</div>
                    </div>
                    <div style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#475569',marginBottom:6}}>
                        <span>Page {book.pagesRead} of {book.totalPages}</span>
                        <span style={{fontWeight:700,color:'#2563eb'}}>{pct}%</span>
                      </div>
                      <div style={{background:'#f1f5f9',borderRadius:99,height:6,overflow:'hidden',marginBottom:10}}>
                        <div style={{width:`${pct}%`,background:'#2563eb',height:'100%',borderRadius:99}} />
                      </div>
                      <div style={{display:'flex',gap:8,fontSize:11,color:'#64748b',marginBottom:12,flexWrap:'wrap'}}>
                        {avgSpeed > 0 && <span>⚡ ~{avgSpeed} pg/hr</span>}
                        {eta && <span>⏱️ ~{eta}h left</span>}
                        {sessions.length > 0 && <span>📊 {sessions.length} sessions</span>}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={() => startReading(book)} disabled={!!activeBook}
                          style={{flex:1,background: activeBook ? '#94a3b8' : '#2563eb',color:'white',border:'none',padding:'8px',borderRadius:8,fontSize:12,fontWeight:700,cursor: activeBook ? 'not-allowed' : 'pointer'}}>
                          {activeBook?.id === book.id ? '📖 Reading...' : '▶ Start Reading'}
                        </button>
                        <button onClick={() => deleteBook(book.id)}
                          style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',padding:'8px 10px',borderRadius:8,fontSize:12,cursor:'pointer'}}>🗑</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {books.length === 0 && !activeBook && (
          <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8'}}>
            <div style={{fontSize:48,marginBottom:12}}>📚</div>
            <div style={{fontSize:16,fontWeight:600,color:'#64748b'}}>No PDFs yet</div>
            <div style={{fontSize:13,marginTop:4}}>Upload your first study book to start tracking your reading speed</div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#0f172a',color:'white',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}
    </div>
  )
}
