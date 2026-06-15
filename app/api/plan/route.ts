import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'
import { DEFAULTS } from '@/lib/defaults'
import { sendSignupNotification } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = (session.user as any).id
  let plan = await Plan.findOne({ userId })

  if (!plan) {
    // First login — seed with defaults
    plan = await Plan.create({
      userId,
      email: session.user.email,
      name: session.user.name,
      papers: DEFAULTS,
    })
    // Send signup notification email (non-blocking)
    sendSignupNotification(session.user.name || 'Unknown', session.user.email || '')
  }

  return NextResponse.json(plan)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()
  const userId = (session.user as any).id

  const updated = await Plan.findOneAndUpdate(
    { userId },
    {
      ...body,
      userId,
      email: session.user.email,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt })
}
