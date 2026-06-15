import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'

const ADMIN_EMAIL = 'blackbuck774@gmail.com'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admin can use this
  if (session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action, targetEmail, days } = body
  await connectDB()

  if (action === 'activate_pro') {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + (days || 30))

    const result = await Plan.findOneAndUpdate(
      { email: targetEmail },
      {
        isPro: true,
        subscriptionStatus: 'active',
        subscriptionExpiry: expiry,
        subscriptionId: 'manual_' + Date.now(),
      },
      { upsert: true, new: true }
    )
    return NextResponse.json({ ok: true, email: targetEmail, expiry, userId: result.userId })
  }

  if (action === 'check_user') {
    const plan = await Plan.findOne({ email: targetEmail }, { isPro: 1, subscriptionExpiry: 1, email: 1, userId: 1 })
    return NextResponse.json({ plan })
  }

  if (action === 'list_pro') {
    const pros = await Plan.find({ isPro: true }, { email: 1, subscriptionExpiry: 1, isPro: 1 })
    return NextResponse.json({ pros })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
