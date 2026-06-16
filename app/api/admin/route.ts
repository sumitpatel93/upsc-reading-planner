import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'

const ADMIN_EMAIL = 'sumit.patel93@gmail.com'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [allUsers, todaySignups, weekSignups, monthSignups, proUsers, recentSignups] = await Promise.all([
    Plan.countDocuments(),
    Plan.countDocuments({ createdAt: { $gte: todayStart } }),
    Plan.countDocuments({ createdAt: { $gte: weekStart } }),
    Plan.countDocuments({ createdAt: { $gte: monthStart } }),
    Plan.find({ isPro: true }, { name: 1, email: 1, subscriptionExpiry: 1, subscriptionId: 1 }).sort({ subscriptionExpiry: -1 }),
    Plan.find({}, { name: 1, email: 1, createdAt: 1, isPro: 1, pdfBooks: 1, newsReadCount: 1 }).sort({ createdAt: -1 }).limit(20),
  ])

  const totalPdfUploads = await Plan.aggregate([
    { $project: { count: { $size: { $ifNull: ['$pdfBooks', []] } } } },
    { $group: { _id: null, total: { $sum: '$count' } } }
  ])

  const totalNewsRead = await Plan.aggregate([
    { $group: { _id: null, total: { $sum: { $ifNull: ['$newsReadCount', 0] } } } }
  ])

  return NextResponse.json({
    stats: {
      totalUsers: allUsers,
      todaySignups,
      weekSignups,
      monthSignups,
      totalPro: proUsers.length,
      totalPdfUploads: totalPdfUploads[0]?.total || 0,
      totalNewsRead: totalNewsRead[0]?.total || 0,
    },
    recentSignups: recentSignups.map(u => ({
      name: u.name,
      email: u.email,
      joinedAt: u.createdAt,
      isPro: u.isPro || false,
      pdfCount: u.pdfBooks?.length || 0,
      newsRead: u.newsReadCount || 0,
    })),
    proUsers: proUsers.map(u => ({
      name: u.name,
      email: u.email,
      expiry: u.subscriptionExpiry,
      orderId: u.subscriptionId,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, targetEmail, days } = await req.json()
  await connectDB()

  if (action === 'activate_pro') {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + (days || 30))
    // Match by email — also reset news count so they can use news immediately
    const result = await Plan.findOneAndUpdate(
      { email: targetEmail },
      {
        isPro: true,
        subscriptionStatus: 'active',
        subscriptionExpiry: expiry,
        subscriptionId: 'manual_' + Date.now(),
        newsReadCount: 0,
        newsReadDate: null,
      },
      { upsert: true, new: true }
    )
    return NextResponse.json({ ok: true, expiry, userId: result?.userId })
  }

  if (action === 'revoke_pro') {
    await Plan.findOneAndUpdate({ email: targetEmail }, { isPro: false, subscriptionStatus: 'revoked' })
    return NextResponse.json({ ok: true })
  }

  if (action === 'reset_news') {
    await Plan.findOneAndUpdate(
      { email: targetEmail },
      { newsReadCount: 0, newsReadDate: null }
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
