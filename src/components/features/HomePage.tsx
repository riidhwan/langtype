import { Link } from '@tanstack/react-router'
import { CollectionFilters } from '@/components/features/home/CollectionFilters'
import { CollectionList } from '@/components/features/home/CollectionList'
import { SRSQueuePanel } from '@/components/features/SRSQueuePanel'
import { IconPlus } from '@/components/ui/icons'
import { useHomeCollections } from '@/hooks/useHomeCollections'
import type { Collection } from '@/types/challenge'

interface Props {
    collections: Collection[]
}

export function HomePage({ collections }: Props) {
    const homeCollections = useHomeCollections(collections)

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

                    <CollectionFilters
                        query={homeCollections.query}
                        onQueryChange={homeCollections.setQuery}
                        filter={homeCollections.filter}
                        onFilterChange={homeCollections.setFilter}
                        totalDue={homeCollections.totalDue}
                        tags={homeCollections.allTags}
                        activeTag={homeCollections.activeTag}
                        onTagClick={homeCollections.handleTagClick}
                    />
                </header>

                <CollectionList
                    isHydrated={homeCollections.isHydrated}
                    skeletonCollections={homeCollections.skeletonCollections}
                    collections={homeCollections.visibleCollections}
                />
            </div>
            <SRSQueuePanel />
        </main>
    )
}
