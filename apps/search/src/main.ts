import express from 'express'
import { search, fetchPage } from './scraper'

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4234

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// GET /search?q=query&limit=8
app.get('/search', async (req, res) => {
  const q = req.query.q as string | undefined
  const limit = Math.min(parseInt((req.query.limit as string) ?? '8'), 20)

  if (!q?.trim()) {
    res.status(400).json({ error: 'Missing query parameter "q"' })
    return
  }

  try {
    const results = await search(q.trim(), limit)
    res.json({ query: q.trim(), results })
  } catch (err) {
    console.error('[search]', err)
    res.status(500).json({ error: 'Search failed', detail: (err as Error).message })
  }
})

// GET /fetch?url=https://...
// Fetches a page and returns its plain-text content — useful for follow-up reads
app.get('/fetch', async (req, res) => {
  const url = req.query.url as string | undefined

  if (!url?.trim()) {
    res.status(400).json({ error: 'Missing query parameter "url"' })
    return
  }

  try {
    const page = await fetchPage(url.trim())
    res.json(page)
  } catch (err) {
    console.error('[fetch]', err)
    res.status(500).json({ error: 'Fetch failed', detail: (err as Error).message })
  }
})

app.listen(PORT, () => {
  console.log(`🔍 Bob Search running on http://localhost:${PORT}`)
})
