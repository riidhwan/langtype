import {
    DICTIONARY_ACTIVE_VERSION,
    DICTIONARY_PREFIX_LENGTH,
    DICTIONARY_PUBLIC_BASE_URL,
    DICTIONARY_RESULT_LIMIT,
} from '@/config'
import type { DictionaryEntryChunk, DictionarySearchIndex, DictionarySearchItem } from '@/types/dictionary'

interface DictionarySearchOptions {
    fetcher?: typeof fetch
    limit?: number
}

interface DictionaryEntryOptions {
    fetcher?: typeof fetch
}

const searchChunkCache = new Map<string, Promise<DictionarySearchItem[]>>()
const searchIndexCache = new Map<string, Promise<DictionarySearchIndex>>()

export class DictionaryServiceError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'DictionaryServiceError'
    }
}

/** Normalizes German dictionary terms for chunking and prefix matching. */
export function normalizeDictionarySearchTerm(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
}

export function clearDictionarySearchCache() {
    searchChunkCache.clear()
    searchIndexCache.clear()
}

export async function searchDictionary(
    query: string,
    options: DictionarySearchOptions = {}
) {
    const normalized = normalizeDictionarySearchTerm(query)
    if (normalized.length < DICTIONARY_PREFIX_LENGTH) return []

    const prefix = normalized.slice(0, DICTIONARY_PREFIX_LENGTH)
    const rows = await getSearchRowsForPrefix(prefix, options.fetcher)

    const seen = new Set<string>()
    return rows
        .filter((row) => row.normalized.startsWith(normalized))
        .sort((a, b) => a.rank - b.rank || a.lemma.localeCompare(b.lemma, 'de'))
        .filter((row) => {
            if (seen.has(row.id)) return false
            seen.add(row.id)
            return true
        })
        .slice(0, options.limit ?? DICTIONARY_RESULT_LIMIT)
}

function getSearchRowsForPrefix(prefix: string, fetcher?: typeof fetch) {
    const cacheKey = getSearchCacheKey(prefix)
    const cachedRows = searchChunkCache.get(cacheKey)
    if (cachedRows && !fetcher) return cachedRows

    const rowsPromise = fetchSearchRowsForPrefix(prefix, fetcher)
    if (!fetcher) {
        searchChunkCache.set(cacheKey, rowsPromise)
        rowsPromise.catch(() => {
            if (searchChunkCache.get(cacheKey) === rowsPromise) {
                searchChunkCache.delete(cacheKey)
            }
        })
    }

    return rowsPromise
}

async function fetchSearchRowsForPrefix(prefix: string, fetcher?: typeof fetch) {
    const searchIndex = await getSearchIndex(fetcher)
    const files = searchIndex[searchPrefixFileKey(prefix)] ?? []
    const chunkUrls = files.map((file) => dictionaryUrl(`search/${file}`))
    const chunks = await Promise.all(chunkUrls.map((url) => fetchJson<DictionarySearchItem[]>(url, fetcher)))
    return chunks.flat()
}

function getSearchIndex(fetcher?: typeof fetch) {
    const cacheKey = getDictionaryArtifactBaseUrl()
    const cachedIndex = searchIndexCache.get(cacheKey)
    if (cachedIndex && !fetcher) return cachedIndex

    const indexPromise = fetchJson<DictionarySearchIndex>(dictionaryUrl('search-index.json'), fetcher)
    if (!fetcher) {
        searchIndexCache.set(cacheKey, indexPromise)
        indexPromise.catch(() => {
            if (searchIndexCache.get(cacheKey) === indexPromise) {
                searchIndexCache.delete(cacheKey)
            }
        })
    }

    return indexPromise
}

function getSearchCacheKey(prefix: string) {
    return `${getDictionaryArtifactBaseUrl()}/search/${prefix}`
}

function searchPrefixFileKey(prefix: string) {
    return `p${Array.from(new TextEncoder().encode(prefix))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')}`
}

export async function getDictionaryEntry(
    item: Pick<DictionarySearchItem, 'id' | 'entryBucket'>,
    options: DictionaryEntryOptions = {}
) {
    const chunk = await fetchJson<DictionaryEntryChunk>(
        dictionaryUrl(`entries/${item.entryBucket}.json`),
        options.fetcher
    )
    return chunk.entries[item.id] ?? null
}

function dictionaryUrl(path: string) {
    const base = getDictionaryArtifactBaseUrl()
    if (!base) {
        throw new DictionaryServiceError('Dictionary is not configured.')
    }
    return `${base}/${path}`
}

function getDictionaryArtifactBaseUrl() {
    const base = DICTIONARY_PUBLIC_BASE_URL.replace(/\/$/, '')
    const version = DICTIONARY_ACTIVE_VERSION.replace(/^\//, '').replace(/\/$/, '')
    if (!base || !version) return ''
    return `${base}/dictionary/${version}`
}

async function fetchJson<T>(url: string, fetcher: typeof fetch = fetch): Promise<T> {
    const response = await fetcher(url)
    if (!response.ok) {
        throw new DictionaryServiceError(`Dictionary request failed: ${response.status}`)
    }
    return await response.json() as T
}
