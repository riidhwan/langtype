import { useMemo, useState } from 'react'
import { DEFAULT_HOME_TAG } from '@/config'
import {
    filterHomeCollectionRows,
    getDueCountByCollection,
    getHomeCollectionTags,
    mergeHomeCollections,
    sortHomeCollections,
    toHomeCollectionRows,
    type HomeCollectionFilter,
} from '@/lib/homeCollections'
import { useCustomCollectionsStore } from '@/store/useCustomCollectionsStore'
import { useSRSStore } from '@/store/useSRSStore'
import type { Collection } from '@/types/challenge'

export function useHomeCollections(collections: Collection[]) {
    const cards = useSRSStore((s) => s.cards)
    const hasHydrated = useSRSStore((s) => s._hasHydrated)
    const lastPlayedAt = useSRSStore((s) => s.lastPlayedAt)
    const customCollections = useCustomCollectionsStore((s) => s.collections)
    const customHasHydrated = useCustomCollectionsStore((s) => s._hasHydrated)

    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<HomeCollectionFilter>('all')
    const [activeTag, setActiveTag] = useState<string | null>(DEFAULT_HOME_TAG)

    const mergedCollections = useMemo(
        () => mergeHomeCollections(collections, customCollections),
        [collections, customCollections],
    )

    const sortedCollections = useMemo(
        () => sortHomeCollections(mergedCollections, lastPlayedAt),
        [mergedCollections, lastPlayedAt],
    )

    const allTags = useMemo(
        () => getHomeCollectionTags(sortedCollections),
        [sortedCollections],
    )

    const dueCountByCollection = useMemo(
        () => getDueCountByCollection(cards, hasHydrated),
        [cards, hasHydrated],
    )

    const rows = useMemo(
        () => toHomeCollectionRows(sortedCollections, dueCountByCollection),
        [sortedCollections, dueCountByCollection],
    )

    const visibleCollections = useMemo(
        () => filterHomeCollectionRows(rows, { query, filter, activeTag }),
        [rows, query, filter, activeTag],
    )

    const totalDue = useMemo(
        () => rows.filter((row) => row.dueCount > 0).length,
        [rows],
    )

    const handleTagClick = (tag: string) => {
        setActiveTag((prev) => prev === tag ? null : tag)
    }

    return {
        query,
        setQuery,
        filter,
        setFilter,
        activeTag,
        handleTagClick,
        allTags,
        totalDue,
        isHydrated: hasHydrated && customHasHydrated,
        skeletonCollections: mergedCollections,
        visibleCollections,
    }
}
