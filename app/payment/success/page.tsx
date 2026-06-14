'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentResult() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')

  useEffect(() => {
    if (!session) return
    const orderId = params.get('order_id')
    const paymentStatus = params.get('order_status') || 'SUCCESS'
    if (!orderId) { setStatus('failed'); return }
    fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paymentStatus }),
    }).then(r => r.json()).then(d => setStatus(d.ok ? 'success' : 'failed')).catch(() => setStatus('failed'))
  }, [session, params])

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:'white', borderRadius:20, padding:'48px 40px', maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.1)' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>Verifying payment...</div>
            <div style={{ fontSize:14, color:'#64748b', marginTop:8 }}>Please wait a moment</div>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#16a34a', marginBottom:8 }}>Payment Successful!</div>
            <div style={{ fontSize:14, color:'#64748b', marginBottom:8 }}>Your Pro plan is now active for 30 days.</div>
            <div style={{ background:'#f0fdf4', borderRadius:12, padding:'16px', marginBottom:28, fontSize:13, color:'#15803d' }}>
              Unlimited PDF uploads · Unlimited storage · Full speed tracking
            </div>
            <button onClick={() => router.push('/pdf')}
              style={{ width:'100%', padding:'14px', background:'#2563eb', color:'white', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
              Go to PDF Reader
            </button>
            <button onClick={() => router.push('/dashboard')}
              style={{ width:'100%', padding:'12px', background:'none', border:'1.5px solid #e2e8f0', color:'#475569', borderRadius:12, fontSize:14, cursor:'pointer' }}>
              Back to Planner
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#dc2626', marginBottom:8 }}>Payment Failed</div>
            <div style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>Something went wrong. If money was deducted, it will be refunded in 5-7 days.</div>
            <button onClick={() => router.push('/pdf')}
              style={{ width:'100%', padding:'14px', background:'#2563eb', color:'white', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor:'pointer' }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#64748b' }}>Loading...</div>}>
      <PaymentResult />
    </Suspense>
  )
}
