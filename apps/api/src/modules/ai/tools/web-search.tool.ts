import { Logger } from '@nestjs/common'
import { webSearch, fetchPage, type SearchResult } from './scraper'

const logger = new Logger('WebSearchTool')

export interface SearchOutput {
  query: string
  results: SearchResult[]
}

export interface FetchOutput {
  title: string
  text: string
  url: string
}

export async function runWebSearch(query: string): Promise<SearchOutput> {
  logger.debug(`web_search: "${query}"`)
  try {
    const results = await webSearch(query, 6)
    return { query, results }
  } catch (e) {
    logger.error(`web_search failed: ${(e as Error).message}`)
    return { query, results: [] }
  }
}

export async function runFetchPage(url: string): Promise<FetchOutput> {
  logger.debug(`fetch_page: "${url}"`)
  try {
    return await fetchPage(url)
  } catch (e) {
    logger.error(`fetch_page failed: ${(e as Error).message}`)
    return { title: '', text: `Could not fetch page: ${(e as Error).message}`, url }
  }
}

export function formatSearchResults(output: SearchOutput): string {
  if (!output.results.length) return `No results found for "${output.query}".`
  const lines = output.results.map((r, i) =>
    `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`
  )
  return `Search results for "${output.query}":\n\n${lines.join('\n\n')}`
}

export function formatFetchResult(output: FetchOutput): string {
  if (!output.text) return `No content retrieved from ${output.url}.`
  return `**${output.title || output.url}**\n\n${output.text}`
}

// ─── Tool definitions ──────────────────────────────────────────────────────

export const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description: 'Search the web for current information, news, facts, prices, or anything you are not certain about. Use proactively whenever the question involves real-world or recent data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'A specific, well-formed search query' },
    },
    required: ['query'],
  },
}

export const FETCH_PAGE_TOOL = {
  name: 'fetch_page',
  description: 'Fetch and read the full text of a web page. Use after web_search to get deeper content from a result, or when the user shares a URL to read.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The full URL of the page to fetch' },
    },
    required: ['url'],
  },
}

export const WEB_SEARCH_FUNCTION = {
  type: 'function' as const,
  function: { name: 'web_search', description: WEB_SEARCH_TOOL.description, parameters: WEB_SEARCH_TOOL.input_schema },
}

export const FETCH_PAGE_FUNCTION = {
  type: 'function' as const,
  function: { name: 'fetch_page', description: FETCH_PAGE_TOOL.description, parameters: FETCH_PAGE_TOOL.input_schema },
}
