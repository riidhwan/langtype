import type { Collection } from '@/types/challenge'
import type { HomeCollectionRow } from '@/lib/homeCollections'
import { CollectionRow } from '@/components/features/home/CollectionRow'

interface Props {
    isHydrated: boolean
    skeletonCollections: Collection[]
    collections: HomeCollectionRow[]
}

export function CollectionList({ isHydrated, skeletonCollections, collections }: Props) {
    if (!isHydrated) {
        return (
            <div className="flex flex-col divide-y divide-border border rounded-[var(--radius)] bg-card">
                {skeletonCollections.map((collection) => (
                    <div key={collection.id} className="h-[64px] animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col divide-y divide-border border rounded-[var(--radius)] bg-card overflow-hidden">
            {collections.map((row) => (
                <CollectionRow key={row.collection.id} row={row} />
            ))}
        </div>
    )
}
