import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, bookId, data } = body

  await connectDB()
  const userId = (session.user as any).id

  if (action === 'add_pdf') {
    // Add PDF book to user's plan
    const { name, pdfUrl, totalPages, paperId, subjectId } = data
    await Plan.findOneAndUpdate(
      { userId },
      { $push: { pdfBooks: { id: crypto.randomUUID(), name, pdfUrl, totalPages, paperId, subjectId, pagesRead: 0, sessions: [], createdAt: new Date() } } },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_session') {
    // Update reading session data
    const { bookId: bid, pagesRead, duration, speed } = data
    await Plan.findOneAndUpdate(
      { userId, 'pdfBooks.id': bid },
      {
        $set: { 'pdfBooks.$.pagesRead': pagesRead },
        $push: { 'pdfBooks.$.sessions': { pagesRead, duration, speed, date: new Date() } }
      }
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_pdf') {
    await Plan.findOneAndUpdate(
      { userId },
      { $pull: { pdfBooks: { id: bookId } } }
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = (session.user as any).id
  const plan = await Plan.findOne({ userId }, { pdfBooks: 1 })
  return NextResponse.json({ pdfBooks: plan?.pdfBooks || [] })
}
