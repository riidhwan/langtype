import { isCardDue } from '@/lib/srsAlgorithm'
import {
    isCustomCollectionId,
    isValidCustomCollection,
    toPlayableCollection,
    type CustomCollection,
} from '@/store/useCustomCollectionsStore'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'

export type HomeCollectionFilter = 'all' | 'due'

export interface HomeCollectionRow {
    collection: Collection
    dueCount: number
    isCustom: boolean
}

export interface HomeCollectionFilters {
    query: string
    filter: HomeCollectionFilter
    activeTag: string | null
}

export function mergeHomeCollections(
    collections: Collection[],
    customCollections: Record<string, CustomCollection>,
): Collection[] {
    const builtIns = collections.filter((collection) => !isCustomCollectionId(collection.id))
    const playableCustom = Object.values(customCollections)
        .filter(isValidCustomCollection)
        .map(toPlayableCollection)

    return [...playableCustom, ...builtIns]
}

export function sortHomeCollections(
    collections: Collection[],
    lastPlayedAt: Record<string, number>,
): Collection[] {
    return [...collections].sort(
        (a, b) => (lastPlayedAt[b.id] ?? 0) - (lastPlayedAt[a.id] ?? 0)
    )
}

export function getHomeCollectionTags(collections: Collection[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []

    for (const collection of collections) {
        for (const tag of collection.tags ?? []) {
            if (seen.has(tag)) continue
            seen.add(tag)
            result.push(tag)
        }
    }

    return result
}

export function getDueCountByCollection(
    cards: Record<string, SRSCard>,
    hasHydrated: boolean,
): Record<string, number> {
    if (!hasHydrated) return {}

    const counts: Record<string, number> = {}
    for (const card of Object.values(cards)) {
        if (!isCardDue(card)) continue
        counts[card.collectionId] = (counts[card.collectionId] ?? 0) + 1
    }

    return counts
}

export function toHomeCollectionRows(
    collections: Collection[],
    dueCountByCollection: Record<string, number>,
): HomeCollectionRow[] {
    return collections.map((collection) => ({
        collection,
        dueCount: dueCountByCollection[collection.id] ?? 0,
        isCustom: isCustomCollectionId(collection.id),
    }))
}

export function filterHomeCollectionRows(
    rows: HomeCollectionRow[],
    filters: HomeCollectionFilters,
): HomeCollectionRow[] {
    const query = filters.query.trim().toLowerCase()

    return rows.filter(({ collection, dueCount }) => {
        const matchesQuery = !query
            || collection.title.toLowerCase().includes(query)
            || (collection.description ?? '').toLowerCase().includes(query)
        const matchesDue = filters.filter === 'all' || dueCount > 0
        const matchesTag = filters.activeTag === null || (collection.tags ?? []).includes(filters.activeTag)

        return matchesQuery && matchesDue && matchesTag
    })
}
