export const OA_BASE = 'https://api.openalex.org'
const OA_MAILTO = process.env.OPENALEX_MAILTO || ''

export interface OaWork {
  id: string
  title: string | null
  abstract_inverted_index: Record<string, number[]> | null
  publication_year: number | null
  cited_by_count: number
  primary_location: {
    source?: { display_name?: string }
    landing_page_url?: string
  } | null
  doi: string | null
  authorships: Array<{
    author: { id: string; display_name: string }
  }>
  referenced_works: string[]
}

export interface Paper {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  citationCount: number
  influentialCitationCount: number
  venue: string
  authors: Array<{ authorId: string; name: string }>
  url: string
}

export function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string | null {
  if (!invertedIndex) return null
  const words: Array<[number, string]> = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word])
    }
  }
  words.sort((a, b) => a[0] - b[0])
  return words.map(([, w]) => w).join(' ')
}

export function mapWorkToPaper(work: OaWork): Paper | null {
  if (!work?.id) return null
  return {
    paperId: work.id.replace('https://openalex.org/', ''),
    title: work.title ?? '',
    abstract: reconstructAbstract(work.abstract_inverted_index),
    year: work.publication_year,
    citationCount: work.cited_by_count ?? 0,
    influentialCitationCount: 0,
    venue: work.primary_location?.source?.display_name ?? '',
    authors: (work.authorships ?? [])
      .filter(a => a?.author?.id && a?.author?.display_name)
      .map(a => ({
        authorId: a.author.id.replace('https://openalex.org/', ''),
        name: a.author.display_name,
      })),
    url: work.doi ?? work.primary_location?.landing_page_url ?? '',
  }
}

export async function oaFetch(url: string, timeout = 15000): Promise<Response> {
  const u = new URL(url)
  if (OA_MAILTO && !u.searchParams.has('mailto')) {
    u.searchParams.set('mailto', OA_MAILTO)
  }
  return fetch(u.toString(), { signal: AbortSignal.timeout(timeout) })
}
