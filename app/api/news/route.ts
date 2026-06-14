import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'

const FREE_LIMIT = 10

const RSS_FEEDS = [
  { name: 'PIB', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3' },
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'Indian Express', url: 'https://indianexpress.com/section/india/feed/' },
]

const TOPICS: Record<string, string[]> = {
  'Polity & Governance': ['parliament','bill','act','supreme court','constitution','election','commission','government','ministry','policy','scheme','cabinet','rajya sabha','lok sabha','president','governor','judiciary','high court'],
  'Economy': ['gdp','rbi','inflation','budget','trade','bank','fiscal','monetary','economy','finance','tax','gst','export','import','investment','growth','rupee','market','sebi'],
  'International Relations': ['bilateral','treaty','summit','united nations','un ','foreign','diplomat','india-','visit','agreement','cooperation','g20','brics','saarc','asean','nato'],
  'Environment & Ecology': ['climate','wildlife','forest','pollution','disaster','flood','cyclone','drought','environment','species','biodiversity','emission','carbon','renewable','solar','green'],
  'Science & Technology': ['isro','space','satellite','ai ','artificial intelligence','nuclear','health','vaccine','covid','disease','technology','digital','cyber','research','innovation','mission'],
  'Geography & Disaster': ['earthquake','tsunami','cyclone','flood','drought','state','district','river','dam','geography','census','population','urban','rural','migration'],
  'History & Culture': ['heritage','asi ','archaeological','festival','tribe','art','culture','tradition','history','monument','museum','language','religion','yoga','classical'],
}

function categorizeTopic(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some(k => text.includes(k))) return topic
  }
  return 'General'
}

async function fetchRSS(feed: { name: string; url: string }) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    const xml = await res.text()
    const items: any[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<guid>(.*?)<\/guid>/)?.[1] || ''
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || item.match(/<description>(.*?)<\/description>/)?.[1] || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
          link: link.trim(),
          description: desc.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').substring(0, 200).trim(),
          pubDate,
          source: feed.name,
          topic: categorizeTopic(title, desc),
        })
      }
    }
    return items
  } catch {
    return []
  }
}

async function getAISummary(title: string, description: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{
          role: 'user',
          content: 'In exactly one concise sentence (max 20 words), explain why this news is relevant for UPSC CSE preparation. News: ' + title + '. ' + description
        }]
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || ''
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = (session.user as any).id
  const plan = await Plan.findOne({ userId }, { isPro: 1, subscriptionExpiry: 1, newsReadCount: 1, newsReadDate: 1 })
  const isPro = plan?.isPro && plan?.subscriptionExpiry > new Date()

  // Check daily limit for free users
  const today = new Date().toDateString()
  const lastDate = plan?.newsReadDate ? new Date(plan.newsReadDate).toDateString() : null
  const count = lastDate === today ? (plan?.newsReadCount || 0) : 0

  const topic = req.nextUrl.searchParams.get('topic') || 'all'

  // Fetch all feeds in parallel
  const results = await Promise.all(RSS_FEEDS.map(fetchRSS))
  let articles = results.flat()

  // Filter by topic
  if (topic !== 'all') {
    articles = articles.filter(a => a.topic === topic)
  }

  // Sort by date
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  // Apply free limit
  const remaining = isPro ? 999 : Math.max(0, FREE_LIMIT - count)
  const limited = isPro ? articles : articles.slice(0, remaining)

  // Generate AI summaries for displayed articles
  const withSummaries = await Promise.all(
    limited.slice(0, 15).map(async (article) => {
      const summary = await getAISummary(article.title, article.description)
      return { ...article, upscSummary: summary }
    })
  )

  // Update read count
  if (!isPro && limited.length > 0) {
    await Plan.findOneAndUpdate(
      { userId },
      { newsReadCount: count + limited.length, newsReadDate: new Date() },
      { upsert: true }
    )
  }

  return NextResponse.json({
    articles: withSummaries,
    isPro,
    remaining: isPro ? 999 : Math.max(0, remaining - limited.length),
    total: articles.length,
  })
}
