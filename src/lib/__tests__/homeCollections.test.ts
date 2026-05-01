import { describe, expect, it } from 'vitest'
import {
    filterHomeCollectionRows,
    getDueCountByCollection,
    getHomeCollectionTags,
    mergeHomeCollections,
    sortHomeCollections,
    toHomeCollectionRows,
} from '../homeCollections'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import type { CustomCollection } from '@/store/useCustomCollectionsStore'

const FUTURE = Date.now() + 86_400_000

function collection(id: string, title: string, overrides: Partial<Collection> = {}): Collection {
    return {
        id,
        title,
        description: `Description for ${id}`,
        ...overrides,
    }
}

function customCollection(
    id: string,
    title: string,
    overrides: Partial<CustomCollection> = {},
): CustomCollection {
    return {
        ...collection(id, title, { challenges: [{ id: '1', translation: 'Hallo' }] }),
        createdAt: 1,
        updatedAt: 2,
        ...overrides,
    }
}

function card(overrides: Partial<SRSCard> = {}): SRSCard {
    return {
        collectionId: 'a',
        challengeId: '1',
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewAt: 0,
        lastReviewedAt: 0,
        ...overrides,
    }
}

describe('homeCollections', () => {
    it('merges playable custom collections before built-ins and excludes custom loader entries', () => {
        const result = mergeHomeCollections(
            [
                collection('custom_from_loader', 'Loader custom'),
                collection('built_in', 'Built in'),
            ],
            {
                custom_ready: customCollection('custom_ready', 'Ready custom'),
                custom_draft: customCollection('custom_draft', 'Draft', { challenges: [] }),
            },
        )

        expect(result.map((item) => item.id)).toEqual(['custom_ready', 'built_in'])
    })

    it('sorts collections by most recent play timestamp', () => {
        const result = sortHomeCollections(
            [collection('a', 'Alpha'), collection('b', 'Beta'), collection('c', 'Gamma')],
            { c: 10, a: 20 },
        )

        expect(result.map((item) => item.id)).toEqual(['a', 'c', 'b'])
    })

    it('dedupes tags in sorted encounter order', () => {
        const result = getHomeCollectionTags([
            collection('a', 'Alpha', { tags: ['X', 'Y'] }),
            collection('b', 'Beta', { tags: ['X', 'Z'] }),
        ])

        expect(result).toEqual(['X', 'Y', 'Z'])
    })

    it('counts due cards by collection after hydration', () => {
        const result = getDueCountByCollection(
            {
                'a:1': card({ collectionId: 'a', challengeId: '1', nextReviewAt: 0 }),
                'a:2': card({ collectionId: 'a', challengeId: '2', nextReviewAt: FUTURE }),
                'b:1': card({ collectionId: 'b', challengeId: '1', nextReviewAt: 0 }),
            },
            true,
        )

        expect(result).toEqual({ a: 1, b: 1 })
    })

    it('returns no due counts before SRS hydration', () => {
        const result = getDueCountByCollection(
            { 'a:1': card({ collectionId: 'a', nextReviewAt: 0 }) },
            false,
        )

        expect(result).toEqual({})
    })

    it('filters rows by query, due state, and active tag together', () => {
        const rows = toHomeCollectionRows(
            [
                collection('a', 'Alpha', { tags: ['X'] }),
                collection('b', 'Beta', { tags: ['X'], description: 'Contains alpha text' }),
                collection('c', 'Gamma', { tags: ['Y'] }),
            ],
            { a: 1, b: 0, c: 1 },
        )

        const result = filterHomeCollectionRows(rows, {
            query: 'alpha',
            filter: 'due',
            activeTag: 'X',
        })

        expect(result.map((row) => row.collection.id)).toEqual(['a'])
    })
})
