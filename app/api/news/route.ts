import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Plan } from '@/lib/models'

const FREE_LIMIT = 10

// UPSC topic keywords for classification
const TOPICS: Record<string, string[]> = {
  'Polity & Governance': ['parliament','bill','act','supreme court','constitution','election','commission','government','ministry','policy','scheme','cabinet','rajya sabha','lok sabha','president','governor','judiciary','high court','legislation','ordinance','amendment','panchayat','municipal','bureaucracy','court verdict','cbi','rti','lokpal','comptroller'],
  'Economy': ['gdp','rbi','inflation','budget','trade','bank','fiscal','monetary','economy','finance','tax','gst','export','import','investment','growth','rupee','market','sebi','msme','startup','fdi','disinvestment','revenue','expenditure','subsidy','insurance','pension','loan','credit','unemployment','manufacturing','commodity','sensex','nifty','interest rate','repo rate'],
  'International Relations': ['bilateral','treaty','summit','united nations','un ','foreign minister','diplomat','india-china','india-pakistan','india-us','india-russia','visit','agreement','cooperation','g20','brics','saarc','asean','nato','imf','world bank','wto','quad','sanctions','geopolit','border dispute','indo-pacific','embassy','consul','extradition'],
  'Environment & Ecology': ['climate','wildlife','forest','pollution','disaster','flood','cyclone','drought','environment','species','biodiversity','emission','carbon','renewable','solar','green','tiger','elephant','wetland','coral','mangrove','ozone','plastic','waste','air quality','aqi','net zero','cop','paris agreement','national park','sanctuary'],
  'Science & Technology': ['isro','space','satellite','artificial intelligence','nuclear','health','vaccine','disease','technology','digital','cyber','research','innovation','mission','rocket','launch','chandrayaan','gaganyaan','5g','semiconductor','quantum','biotech','pharma','drug','medicine','hospital','cancer','robot','drone','defence technology','iit','iiser'],
  'Geography & Disaster': ['earthquake','tsunami','cyclone','flood','drought','river','dam','geography','census','population','urban','rural','migration','landslide','glacier','himalaya','peninsula','plateau','delta','port','mineral','coal','oil','gas','irrigation','hydropower','disaster management','ndrf'],
  'History & Culture': ['heritage','archaeological','festival','tribe','art','culture','tradition','history','monument','museum','language','religion','yoga','classical','craft','dance','music','unesco','intangible','ancient','medieval','colonial','freedom','independence','constitution day','national award'],
}

function categorizeTopic(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some(k => text.includes(k))) return topic
  }
  return 'General'
}

// Fetch from NewsAPI.org - free tier, server-side, no CORS issues
async function fetchFromNewsAPI(query: string, pageSize: number = 10) {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('q', query)
    url.searchParams.set('language', 'en')
    url.searchParams.set('sortBy', 'publishedAt')
    url.searchParams.set('pageSize', String(pageSize))
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('domains', 'thehindu.com,indianexpress.com,ndtv.com,timesofindia.indiatimes.com,livemint.com,financialexpress.com,business-standard.com,downtoearth.org.in,thewire.in,scroll.in,theprint.in,hindustantimes.com')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.status !== 'ok') return []

    return (data.articles || []).map((a: any) => ({
      title: a.title?.replace(/ - .*$/, '').trim() || '',
      link: a.url || '',
      description: a.description?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
      pubDate: a.publishedAt || '',
      source: a.source?.name || 'News',
      urlToImage: a.urlToImage || '',
      topic: categorizeTopic(a.title || '', a.description || ''),
    })).filter((a: any) => a.title && a.link && !a.title.includes('[Removed]'))
  } catch {
    return []
  }
}

// Fallback: GNews API (also free, 100 req/day)
async function fetchFromGNews(query: string, pageSize: number = 10) {
  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://gnews.io/api/v4/search')
    url.searchParams.set('q', query)
    url.searchParams.set('lang', 'en')
    url.searchParams.set('country', 'in')
    url.searchParams.set('max', String(pageSize))
    url.searchParams.set('apikey', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const data = await res.json()

    return (data.articles || []).map((a: any) => ({
      title: a.title?.trim() || '',
      link: a.url || '',
      description: a.description?.substring(0, 200) || '',
      pubDate: a.publishedAt || '',
      source: a.source?.name || 'News',
      urlToImage: a.image || '',
      topic: categorizeTopic(a.title || '', a.description || ''),
    })).filter((a: any) => a.title && a.link)
  } catch {
    return []
  }
}

// Fallback: Currents API (free, 600 req/day)
async function fetchFromCurrentsAPI(pageSize: number = 10) {
  const apiKey = process.env.CURRENTS_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://api.currentsapi.services/v1/search')
    url.searchParams.set('keywords', 'india government policy economy environment')
    url.searchParams.set('language', 'en')
    url.searchParams.set('country', 'IN')
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('apiKey', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const data = await res.json()

    return (data.news || []).map((a: any) => ({
      title: a.title?.trim() || '',
      link: a.url || '',
      description: a.description?.substring(0, 200) || '',
      pubDate: a.published || '',
      source: 'News',
      urlToImage: a.image || '',
      topic: categorizeTopic(a.title || '', a.description || ''),
    })).filter((a: any) => a.title && a.link)
  } catch {
    return []
  }
}

// PIB direct API (official government, always works server-side)
async function fetchFromPIB() {
  try {
    const res = await fetch('https://pib.gov.in/AllRelease.aspx', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()

    const articles: any[] = []
    // Extract news from PIB HTML - look for news items
    const linkRegex = /<a[^>]+href="([^"]*PressReleasePage[^"]*)"[^>]*>([^<]+)<\/a>/g
    let match
    while ((match = linkRegex.exec(html)) !== null && articles.length < 10) {
      const title = match[2].trim()
      const path = match[1]
      if (title.length > 20) {
        const link = path.startsWith('http') ? path : 'https://pib.gov.in/' + path
        articles.push({
          title,
          link,
          description: '',
          pubDate: new Date().toISOString(),
          source: 'PIB',
          urlToImage: '',
          topic: categorizeTopic(title, ''),
        })
      }
    }
    return articles
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
          content: 'In one concise sentence (max 18 words), explain why this news matters for UPSC CSE preparation. News: ' + title + '. ' + description
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

  const today = new Date().toDateString()
  const lastDate = plan?.newsReadDate ? new Date(plan.newsReadDate).toDateString() : null
  const count = lastDate === today ? (plan?.newsReadCount || 0) : 0

  const topic = req.nextUrl.searchParams.get('topic') || 'all'

  // UPSC-relevant search queries by topic
  const topicQueries: Record<string, string> = {
    'Polity & Governance': 'india parliament government policy supreme court',
    'Economy': 'india economy RBI budget GDP trade finance',
    'International Relations': 'india foreign policy bilateral summit diplomacy',
    'Environment & Ecology': 'india environment climate wildlife forest pollution',
    'Science & Technology': 'india ISRO technology innovation space digital',
    'Geography & Disaster': 'india flood drought cyclone earthquake geography',
    'History & Culture': 'india heritage culture UNESCO monument festival',
    'all': 'india government policy economy environment UPSC'
  }

  const query = topicQueries[topic] || topicQueries['all']

  // Try sources in order — use whichever has API keys set
  let articles: any[] = []

  // Primary: NewsAPI
  if (process.env.NEWS_API_KEY) {
    articles = await fetchFromNewsAPI(query, 20)
  }

  // Secondary: GNews
  if (articles.length < 5 && process.env.GNEWS_API_KEY) {
    const gnews = await fetchFromGNews(query, 15)
    articles = [...articles, ...gnews]
  }

  // Tertiary: Currents API
  if (articles.length < 5 && process.env.CURRENTS_API_KEY) {
    const currents = await fetchFromCurrentsAPI(15)
    articles = [...articles, ...currents]
  }

  // Always add PIB (official, no key needed)
  const pib = await fetchFromPIB()
  articles = [...articles, ...pib]

  // Filter by topic if needed
  if (topic !== 'all') {
    const topicFiltered = articles.filter(a => a.topic === topic)
    if (topicFiltered.length > 0) articles = topicFiltered
  }

  // Remove duplicates by title
  const seen = new Set<string>()
  articles = articles.filter(a => {
    const key = a.title.toLowerCase().substring(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by date
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  // Apply free limit
  const remaining = isPro ? 999 : Math.max(0, FREE_LIMIT - count)
  const limited = isPro ? articles : articles.slice(0, remaining)

  // Generate AI summaries for top 15 articles
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
    sources: {
      newsapi: !!process.env.NEWS_API_KEY,
      gnews: !!process.env.GNEWS_API_KEY,
      currents: !!process.env.CURRENTS_API_KEY,
      pib: true,
    }
  })
}
