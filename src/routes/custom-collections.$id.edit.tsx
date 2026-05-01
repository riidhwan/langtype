import { createFileRoute, Link } from '@tanstack/react-router'
import { CollectionEditor } from '@/components/features/CollectionEditor'
import { useCustomCollectionsStore } from '@/store/useCustomCollectionsStore'

export const Route = createFileRoute('/custom-collections/$id/edit')({
    component: EditCustomCollectionPage,
})

export function EditCustomCollectionPage() {
    const { id } = Route.useParams()
    const collection = useCustomCollectionsStore((s) => s.collections[id])
    const hasHydrated = useCustomCollectionsStore((s) => s._hasHydrated)

    if (!hasHydrated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
                Loading collection…
            </main>
        )
    }

    if (!collection) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
                <h1 className="text-2xl font-bold">Collection not found</h1>
                <p className="text-sm text-muted-foreground">This custom collection is not saved on this device.</p>
                <Link
                    to="/"
                    className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary"
                >
                    Home
                </Link>
            </main>
        )
    }

    return <CollectionEditor collection={collection} />
}
