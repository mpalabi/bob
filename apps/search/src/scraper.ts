import * as https from 'https'
import * as http from 'http'
import { load } from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

function get(url: string, extraHeaders: Record<string, string> = {}, redirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http

    const req = lib.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          DNT: '1',
          ...extraHeaders,
        },
      },
      res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects <= 0) return reject(new Error('Too many redirects'))
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.host}${res.headers.location}`
          return resolve(get(next, {}, redirects - 1))
        }
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => (body += chunk))
        res.on('end', () => resolve(body))
      }
    )

    req.on('error', reject)
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Request timeout')) })
    req.end()
  })
}

// ─── DuckDuckGo ───────────────────────────────────────────────────────────

function parseDDG(html: string): SearchResult[] {
  const $ = load(html)
  const results: SearchResult[] = []

  $('.result:not(.result--ad)').each((_, el) => {
    const titleEl = $(el).find('.result__title a, .result__a')
    const urlEl   = $(el).find('.result__url')
    const snippet = $(el).find('.result__snippet').text().trim()
    const title   = titleEl.text().trim()
    const rawUrl  = urlEl.text().trim() || titleEl.attr('href') || ''

    if (!title || !rawUrl) return

    let url = rawUrl
    try {
      const href = titleEl.attr('href') ?? ''
      if (href.startsWith('//duckduckgo.com/l/?')) {
        const uddg = new URL('https:' + href).searchParams.get('uddg')
        if (uddg) url = decodeURIComponent(uddg)
      } else if (href.startsWith('http')) {
        url = href
      }
    } catch { /* keep raw */ }

    results.push({ title, url, snippet, source: 'ddg' })
  })

  return results
}

async function ddgSearch(query: string, limit: number): Promise<SearchResult[]> {
  // Use POST to avoid bot-detection rate limiting on GET
  const payload = `q=${encodeURIComponent(query)}&kl=us-en&kp=-1`

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'html.duckduckgo.com',
        path: '/html/',
        method: 'POST',
        headers: {
          'User-Agent': randomUA(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
          Accept: 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          Referer: 'https://duckduckgo.com/',
        },
      },
      res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', c => (body += c))
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) {
            return reject(new Error(`DDG HTTP ${res.statusCode}`))
          }
          resolve(parseDDG(body).slice(0, limit))
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('DDG timeout')) })
    req.write(payload)
    req.end()
  })
}

// ─── Bing ─────────────────────────────────────────────────────────────────

function parseBing(html: string): SearchResult[] {
  const $ = load(html)
  const results: SearchResult[] = []

  // Bing organic results: li.b_algo
  $('li.b_algo').each((_, el) => {
    const titleEl  = $(el).find('h2 a')
    const title    = titleEl.text().trim()
    const url      = titleEl.attr('href') ?? ''
    const snippet  = $(el).find('.b_caption p, .b_snippetBigText').text().trim()

    if (!title || !url.startsWith('http')) return
    results.push({ title, url, snippet, source: 'bing' })
  })

  return results
}

async function bingSearch(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&count=${limit}`
  const html = await get(url, { Referer: 'https://www.bing.com/' })
  return parseBing(html).slice(0, limit)
}

// ─── Merge & deduplicate ──────────────────────────────────────────────────

function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    try {
      // Normalise URL: strip trailing slash, query params that are tracking noise
      const u = new URL(r.url)
      const key = `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    } catch {
      return false
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function search(query: string, limit = 8): Promise<SearchResult[]> {
  // Run both engines in parallel; whichever returns more results wins,
  // then merge + deduplicate for maximum coverage.
  const [ddgResults, bingResults] = await Promise.allSettled([
    ddgSearch(query, limit),
    bingSearch(query, limit),
  ])

  const combined: SearchResult[] = [
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
    ...(bingResults.status === 'fulfilled' ? bingResults.value : []),
  ]

  if (combined.length === 0) {
    const reasons = [
      ddgResults.status === 'rejected' ? `DDG: ${ddgResults.reason}` : null,
      bingResults.status === 'rejected' ? `Bing: ${bingResults.reason}` : null,
    ].filter(Boolean)
    throw new Error(`All search engines failed — ${reasons.join('; ')}`)
  }

  // Interleave DDG + Bing results by alternating, then deduplicate
  const ddg = ddgResults.status === 'fulfilled' ? ddgResults.value : []
  const bing = bingResults.status === 'fulfilled' ? bingResults.value : []
  const interleaved: SearchResult[] = []
  const maxLen = Math.max(ddg.length, bing.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < ddg.length)  interleaved.push(ddg[i])
    if (i < bing.length) interleaved.push(bing[i])
  }

  return dedupe(interleaved).slice(0, limit)
}

export async function fetchPage(url: string): Promise<{ title: string; text: string; url: string }> {
  const html = await get(url)
  const $ = load(html)

  $('script, style, nav, header, footer, aside, iframe, noscript, [aria-hidden="true"], .ad, .ads, .advertisement').remove()

  const title = $('title').text().trim()

  // Prefer semantic content containers
  const body =
    $('article').text() ||
    $('main').text() ||
    $('[role="main"]').text() ||
    $('.content, .post-content, .entry-content').text() ||
    $('body').text()

  const text = body.replace(/\s+/g, ' ').trim().slice(0, 6000)

  return { title, text, url }
}
