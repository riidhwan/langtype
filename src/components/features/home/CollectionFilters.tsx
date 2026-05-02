import type { HomeCollectionFilter } from '@/lib/homeCollections'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
                <Input
                    type="text"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Search collections…"
                    className="pl-9 pr-9"
                />
                {query && (
                    <Button
                        variant="link"
                        aria-label="Clear search"
                        onClick={() => onQueryChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none no-underline"
                    >
                        ×
                    </Button>
                )}
            </div>

            <div className="flex gap-2 mt-3">
                {(['all', 'due'] as const).map((tab) => (
                    <Button
                        key={tab}
                        variant="pill"
                        selected={filter === tab}
                        onClick={() => onFilterChange(tab)}
                    >
                        {tab === 'all' ? 'All' : `Due (${totalDue})`}
                    </Button>
                ))}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                        <Button
                            key={tag}
                            variant="pill"
                            selected={activeTag === tag}
                            onClick={() => onTagClick(tag)}
                        >
                            {tag}
                        </Button>
                    ))}
                </div>
            )}
        </>
    )
}
