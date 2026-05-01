import { cn } from '@/lib/utils'
import type { HomeCollectionFilter } from '@/lib/homeCollections'
import { IconSearch } from '@/components/ui/icons'

interface Props {
    query: string
    onQueryChange: (query: string) => void
    filter: HomeCollectionFilter
    onFilterChange: (filter: HomeCollectionFilter) => void
    totalDue: number
    tags: string[]
    activeTag: string | null
    onTagClick: (tag: string) => void
}

export function CollectionFilters({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    totalDue,
    tags,
    activeTag,
    onTagClick,
}: Props) {
    return (
        <>
            <div className="relative mt-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Search collections…"
                    className="w-full pl-9 pr-9 py-2 bg-card border border-border rounded-[var(--radius)] text-sm focus:outline-none focus:border-primary"
                />
                {query && (
                    <button
                        onClick={() => onQueryChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="flex gap-2 mt-3">
                {(['all', 'due'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onFilterChange(tab)}
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

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => onTagClick(tag)}
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
        </>
    )
}
