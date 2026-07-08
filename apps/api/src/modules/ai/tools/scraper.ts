import * as https from 'https'
import * as http from 'http'
import { load } from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

// ─── HTTP helper ──────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

export function httpGet(url: string, extraHeaders: Record<string, string> = {}, redirects = 5): Promise<string> {
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
          return resolve(httpGet(next, {}, redirects - 1))
        }
        if (res.statusCode && res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`))
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

function httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      res => {
        let buf = ''
        res.setEncoding('utf8')
        res.on('data', c => (buf += c))
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) return reject(new Error(`HTTP ${res.statusCode}`))
          resolve(buf)
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('POST timeout')) })
    req.write(body)
    req.end()
  })
}

// ─── DuckDuckGo ───────────────────────────────────────────────────────────

function parseDDG(html: string): SearchResult[] {
  const $ = load(html)
  const results: SearchResult[] = []

  $('.result:not(.result--ad)').each((_, el) => {
    const titleEl = $(el).find('.result__title a, .result__a')
    const title   = titleEl.text().trim()
    const rawUrl  = $(el).find('.result__url').text().trim() || titleEl.attr('href') || ''
    const snippet = $(el).find('.result__snippet').text().trim()
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
  const payload = `q=${encodeURIComponent(query)}&kl=us-en&kp=-1`
  const html = await httpPost('https://html.duckduckgo.com/html/', payload, {
    'User-Agent': randomUA(),
    Accept: 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    Referer: 'https://duckduckgo.com/',
  })
  return parseDDG(html).slice(0, limit)
}

// ─── Bing ─────────────────────────────────────────────────────────────────

function parseBing(html: string): SearchResult[] {
  const $ = load(html)
  const results: SearchResult[] = []

  $('li.b_algo').each((_, el) => {
    const titleEl = $(el).find('h2 a')
    const title   = titleEl.text().trim()
    const url     = titleEl.attr('href') ?? ''
    const snippet = $(el).find('.b_caption p, .b_snippetBigText').text().trim()
    if (!title || !url.startsWith('http')) return
    results.push({ title, url, snippet, source: 'bing' })
  })

  return results
}

async function bingSearch(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&count=${limit}`
  const html = await httpGet(url, { Referer: 'https://www.bing.com/' })
  return parseBing(html).slice(0, limit)
}

// ─── Deduplicate by normalised URL ────────────────────────────────────────

function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    try {
      const key = `${new URL(r.url).hostname}${new URL(r.url).pathname}`.toLowerCase().replace(/\/$/, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    } catch {
      return false
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function webSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const [ddg, bing] = await Promise.allSettled([
    ddgSearch(query, limit),
    bingSearch(query, limit),
  ])

  const ddgResults  = ddg.status  === 'fulfilled' ? ddg.value  : []
  const bingResults = bing.status === 'fulfilled' ? bing.value : []

  if (!ddgResults.length && !bingResults.length) {
    throw new Error('All search engines failed')
  }

  // Interleave DDG + Bing so both sources appear near the top, then dedupe
  const interleaved: SearchResult[] = []
  const max = Math.max(ddgResults.length, bingResults.length)
  for (let i = 0; i < max; i++) {
    if (i < ddgResults.length)  interleaved.push(ddgResults[i])
    if (i < bingResults.length) interleaved.push(bingResults[i])
  }

  return dedupe(interleaved).slice(0, limit)
}

export async function fetchPage(url: string): Promise<{ title: string; text: string; url: string }> {
  const html = await httpGet(url)
  const $ = load(html)

  $('script, style, nav, header, footer, aside, iframe, noscript, [aria-hidden="true"], .ad, .ads, .advertisement').remove()

  const title = $('title').text().trim()
  const body  =
    $('article').text() ||
    $('main').text() ||
    $('[role="main"]').text() ||
    $('.content, .post-content, .entry-content').text() ||
    $('body').text()

  const text = body.replace(/\s+/g, ' ').trim().slice(0, 6000)
  return { title, text, url }
}
