import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'
import crypto from 'crypto'

const RZP_KEY = process.env.RAZORPAY_KEY_ID!
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET!
const PLAN_ID = process.env.RAZORPAY_PLAN_ID!

// Create a Razorpay subscription
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  await connectDB()
  const userId = (session.user as any).id

  // CREATE SUBSCRIPTION
  if (action === 'create') {
    const auth = Buffer.from(RZP_KEY + ':' + RZP_SECRET).toString('base64')
    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: PLAN_ID,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: { userId, email: session.user.email }
      })
    })
    const sub = await res.json()
    if (sub.error) return NextResponse.json({ error: sub.error.description }, { status: 400 })
    return NextResponse.json({ subscriptionId: sub.id })
  }

  // VERIFY PAYMENT after Razorpay callback
  if (action === 'verify') {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body
    const expected = crypto
      .createHmac('sha256', RZP_SECRET)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Payment verified — activate Pro
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + 1)
    await Plan.findOneAndUpdate(
      { userId },
      { isPro: true, subscriptionId: razorpay_subscription_id, subscriptionStatus: 'active', subscriptionExpiry: expiry },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  }

  // CHECK STATUS
  if (action === 'status') {
    const plan = await Plan.findOne({ userId }, { isPro: 1, subscriptionExpiry: 1, subscriptionStatus: 1 })
    const isPro = plan?.isPro && plan?.subscriptionExpiry > new Date()
    return NextResponse.json({ isPro: !!isPro, expiry: plan?.subscriptionExpiry })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
