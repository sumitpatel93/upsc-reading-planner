import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { orderId, paymentStatus } = body

  if (paymentStatus !== 'SUCCESS') {
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
  }

  // Verify with Cashfree API
  const appId = process.env.CASHFREE_APP_ID!
  const secretKey = process.env.CASHFREE_SECRET_KEY!
  const env = process.env.CASHFREE_ENV || 'TEST'
  const baseUrl = env === 'PRODUCTION'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com'

  const res = await fetch(baseUrl + '/pg/orders/' + orderId, {
    headers: {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01',
    }
  })
  const order = await res.json()

  if (order.order_status !== 'PAID') {
    return NextResponse.json({ error: 'Order not paid' }, { status: 400 })
  }

  // Activate Pro for 30 days
  await connectDB()
  const userId = (session.user as any).id
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 30)

  await Plan.findOneAndUpdate(
    { userId },
    {
      isPro: true,
      subscriptionId: orderId,
      subscriptionStatus: 'active',
      subscriptionExpiry: expiry,
    },
    { upsert: true }
  )

  return NextResponse.json({ ok: true, expiry })
}
