import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { getCollections } from '@/services/challengeService'
import { useSRSStore } from '@/store/useSRSStore'
import {
    isCustomCollectionId,
    isValidCustomCollection,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'
import { isCardDue } from '@/lib/srsAlgorithm'
import { cn } from '@/lib/utils'
import { IconSearch, IconChevronRight, IconEdit, IconPlus } from '@/components/ui/icons'
import { SRSQueuePanel } from '@/components/features/SRSQueuePanel'
import { DEFAULT_HOME_TAG } from '@/config'

export const Route = createFileRoute('/')({
    component: Home,
    loader: async () => {
        const collections = await getCollections()
        return { collections }
    },
})

export function Home() {
    const { collections } = Route.useLoaderData()
    const cards = useSRSStore((s) => s.cards)
    const hasHydrated = useSRSStore((s) => s._hasHydrated)
    const lastPlayedAt = useSRSStore((s) => s.lastPlayedAt)
    const customCollections = useCustomCollectionsStore((s) => s.collections)
    const customHasHydrated = useCustomCollectionsStore((s) => s._hasHydrated)

    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'due'>('all')
    const [activeTag, setActiveTag] = useState<string | null>(DEFAULT_HOME_TAG)

    const mergedCollections = useMemo(() => {
        const builtIns = collections.filter((collection) => !isCustomCollectionId(collection.id))
        const playableCustom = Object.values(customCollections)
            .filter(isValidCustomCollection)
            .map(toPlayableCollection)
        return [...playableCustom, ...builtIns]
    }, [collections, customCollections])

    const sortedCollections = [...mergedCollections].sort(
        (a, b) => (lastPlayedAt[b.id] ?? 0) - (lastPlayedAt[a.id] ?? 0)
    )

    const allTags = useMemo(() => {
        const seen = new Set<string>()
        const result: string[] = []
        for (const col of sortedCollections) {
            for (const tag of col.tags ?? []) {
                if (!seen.has(tag)) { seen.add(tag); result.push(tag) }
            }
        }
        return result
    }, [sortedCollections])

    const handleTagClick = (tag: string) => setActiveTag(prev => prev === tag ? null : tag)

    const getDueCount = (colId: string) =>
        hasHydrated
            ? Object.entries(cards)
                .filter(([key]) => key.startsWith(`${colId}:`))
                .filter(([, card]) => isCardDue(card))
                .length
            : 0

    const totalDue = sortedCollections.filter((col) => getDueCount(col.id) > 0).length

    const visibleCollections = sortedCollections.filter((col) => {
        const q = query.toLowerCase()
        const matchesQuery = !q
            || col.title.toLowerCase().includes(q)
            || (col.description ?? '').toLowerCase().includes(q)
        const matchesDue = filter === 'all' || getDueCount(col.id) > 0
        const matchesTag = activeTag === null || (col.tags ?? []).includes(activeTag)
        return matchesQuery && matchesDue && matchesTag
    })

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <div className="w-full max-w-4xl">
                <header className="mb-6">
                    <p className="mono-label mb-1">collections</p>
                    <Link
                        to="/custom-collections/new"
                        className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-[var(--bg2)]"
                    >
                        <IconPlus className="h-4 w-4" />
                        Create collection
                    </Link>

                    {/* Search */}
                    <div className="relative mt-4">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search collections…"
                            className="w-full pl-9 pr-9 py-2 bg-card border border-border rounded-[var(--radius)] text-sm focus:outline-none focus:border-primary"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-2 mt-3">
                        {(['all', 'due'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={cn(
                                    'px-3 py-1 rounded-full border text-xs font-mono transition-colors',
                                    filter === tab
                                        ? 'border-primary bg-[var(--accent-dim)] text-primary font-semibold'
                                        : 'border-border text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {tab === 'all' ? 'All' : `Due (${totalDue})`}
                            </button>
                        ))}
                    </div>

                    {/* Tag pills */}
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {allTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagClick(tag)}
                                    className={cn(
                                        'px-3 py-1 rounded-full border text-xs font-mono transition-colors',
                                        activeTag === tag
                                            ? 'border-primary bg-[var(--accent-dim)] text-primary font-semibold'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {!hasHydrated || !customHasHydrated ? (
                    <div className="flex flex-col divide-y divide-border border rounded-[var(--radius)] bg-card">
                        {mergedCollections.map((collection) => (
                            <div key={collection.id} className="h-[64px] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-border border rounded-[var(--radius)] bg-card overflow-hidden">
                        {visibleCollections.map((collection) => {
                            const dueCount = getDueCount(collection.id)

                            const isCustom = isCustomCollectionId(collection.id)

                            return (
                                <div key={collection.id} className="flex items-stretch transition-colors hover:bg-[var(--bg3)]">
                                    <Link
                                        to="/collections/$id"
                                        params={{ id: collection.id }}
                                        preload={false}
                                        className="block min-w-0 flex-1 group"
                                    >
                                        <div className="flex items-center justify-between px-4 py-4 gap-4">
                                            <div className="min-w-0">
                                                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                                    <h2 className="text-[15px] font-semibold group-hover:text-primary transition-colors">
                                                        {collection.title}
                                                    </h2>
                                                    {isCustom && (
                                                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>
                                                {collection.description && (
                                                    <p className="text-sm text-muted-foreground leading-snug">{collection.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {dueCount > 0 && (
                                                    <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold font-mono leading-5">
                                                        {dueCount} due
                                                    </span>
                                                )}
                                                <IconChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </Link>
                                    {isCustom && (
                                        <Link
                                            to="/custom-collections/$id/edit"
                                            params={{ id: collection.id }}
                                            title="Edit collection"
                                            className="flex shrink-0 items-center border-l border-border px-4 text-muted-foreground transition-colors hover:bg-[var(--bg2)] hover:text-foreground"
                                        >
                                            <IconEdit className="h-4 w-4" />
                                            <span className="sr-only">Edit {collection.title}</span>
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <SRSQueuePanel />
        </main>
    )
}
