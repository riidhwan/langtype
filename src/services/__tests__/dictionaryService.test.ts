import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config', () => ({
    DICTIONARY_PUBLIC_BASE_URL: 'https://cdn.example.com',
    DICTIONARY_ACTIVE_VERSION: 'v2026-05-01',
    DICTIONARY_PREFIX_LENGTH: 3,
    DICTIONARY_RESULT_LIMIT: 2,
}))

import {
    clearDictionarySearchCache,
    getDictionaryEntry,
    normalizeDictionarySearchTerm,
    searchDictionary,
} from '../dictionaryService'
import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'

describe('dictionaryService', () => {
    beforeEach(() => {
        clearDictionarySearchCache()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('normalizes case, whitespace, umlauts, and ss spelling', () => {
        expect(normalizeDictionarySearchTerm('  Straße  ')).toBe('strasse')
        expect(normalizeDictionarySearchTerm('Ärger   machen')).toBe('arger machen')
    })

    it('fetches indexed prefix chunks, filters, dedupes, ranks, and limits results', async () => {
        const rows: DictionarySearchItem[] = [
            row('1', 'arbeiten', 'gearbeitet', 'arbeiten', 'form', 10, 'gearbeitet'),
            row('1', 'arbeiten', 'arbeiten', 'arbeiten', 'lemma', 0),
            row('2', 'geben', 'geben', 'geben', 'lemma', 0),
            row('3', 'Gegenwart', 'gegenwart', 'Gegenwart', 'lemma', 0),
        ]
        const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
            if (String(url).endsWith('/search-index.json')) {
                return response({ p676561: ['p676561-00.json'] })
            }
            return response(rows)
        })

        const results = await searchDictionary('gear', { fetcher, limit: 5 })

        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(fetcher).toHaveBeenCalledWith('https://cdn.example.com/dictionary/v2026-05-01/search-index.json')
        expect(fetcher).toHaveBeenCalledWith('https://cdn.example.com/dictionary/v2026-05-01/search/p676561-00.json')
        expect(results.map((item) => item.term)).toEqual(['arbeiten'])
        expect(results[0].matchedTerm).toBe('gearbeitet')
    })

    it('returns an empty list for short queries', async () => {
        const fetcher = vi.fn()
        await expect(searchDictionary('a', { fetcher })).resolves.toEqual([])
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('caches the search index and loaded search shards by normalized prefix', async () => {
        const rows: DictionarySearchItem[] = [
            row('1', 'Cachewort', 'cachewort', 'Cachewort', 'lemma', 0),
        ]
        const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
            if (String(url).endsWith('/search-index.json')) {
                return response({ p636163: ['p636163-00.json'] })
            }
            return response(rows)
        })
        vi.stubGlobal('fetch', fetcher)

        await expect(searchDictionary('cac')).resolves.toEqual(rows)
        await expect(searchDictionary('cach')).resolves.toEqual(rows)

        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('returns an empty list without chunk requests when a prefix is absent from the index', async () => {
        const fetcher = vi.fn(async () => response({ p617262: ['p617262-00.json'] }))

        await expect(searchDictionary('zzz', { fetcher })).resolves.toEqual([])

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(fetcher).toHaveBeenCalledWith('https://cdn.example.com/dictionary/v2026-05-01/search-index.json')
    })

    it('surfaces missing index and network failures', async () => {
        const fetcher = vi.fn(async () => ({ ok: false, status: 404, json: vi.fn() } as unknown as Response))
        await expect(searchDictionary('arb', { fetcher })).rejects.toThrow('Dictionary request failed: 404')
    })

    it('loads an entry from its bucket', async () => {
        const entry: DictionaryEntry = {
            id: '1',
            lemma: 'arbeiten',
            normalized: 'arbeiten',
            pos: 'verb',
            senses: ['to work'],
            forms: [{ form: 'gearbeitet', tags: ['participle', 'past'] }],
            details: { pastParticiple: 'gearbeitet' },
            sounds: [],
        }
        const fetcher = vi.fn(async () => response({ entries: { '1': entry } }))

        await expect(getDictionaryEntry({ id: '1', entryBucket: '0001' }, { fetcher })).resolves.toEqual(entry)
        expect(fetcher).toHaveBeenCalledWith('https://cdn.example.com/dictionary/v2026-05-01/entries/0001.json')
    })
})

function row(
    id: string,
    term: string,
    normalized: string,
    lemma: string,
    matchType: 'lemma' | 'form',
    rank: number,
    matchedTerm?: string
): DictionarySearchItem {
    return {
        id,
        term,
        ...(matchedTerm ? { matchedTerm } : {}),
        normalized,
        lemma,
        pos: 'verb',
        matchType,
        rank,
        entryBucket: '0001',
    }
}

function response(value: unknown) {
    return {
        ok: true,
        status: 200,
        json: vi.fn(async () => value),
    } as unknown as Response
}
