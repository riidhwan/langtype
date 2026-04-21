import { createFileRoute, Link } from '@tanstack/react-router'
import { getCollections } from '@/services/challengeService'
import { useSRSStore } from '@/store/useSRSStore'
import { isCardDue } from '@/lib/srsAlgorithm'

export const Route = createFileRoute('/')({
    component: Home,
    loader: async () => {
        const collections = await getCollections()
        return { collections }
    },
})

function Home() {
    const { collections } = Route.useLoaderData()
    const cards = useSRSStore((s) => s.cards)
    const hasHydrated = useSRSStore((s) => s._hasHydrated)
    const lastPlayedAt = useSRSStore((s) => s.lastPlayedAt)

    const sortedCollections = [...collections].sort(
        (a, b) => (lastPlayedAt[b.id] ?? 0) - (lastPlayedAt[a.id] ?? 0)
    )

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <div className="w-full max-w-4xl">
                <header className="text-center mb-12">
                    <p className="text-xl text-muted-foreground">Select a collection to start practicing.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedCollections.map((collection) => {
                        const dueCount = hasHydrated
                            ? Object.entries(cards)
                                .filter(([key]) => key.startsWith(`${collection.id}:`))
                                .filter(([, card]) => isCardDue(card))
                                .length
                            : 0

                        return (
                            <Link
                                key={collection.id}
                                to="/collections/$id"
                                params={{ id: collection.id }}
                                preload={false}
                                className="block group"
                            >
                                <div className="border rounded-lg p-6 h-full transition-all hover:border-primary hover:shadow-md bg-card">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                                            {collection.title}
                                        </h2>
                                        {dueCount > 0 && (
                                            <span className="shrink-0 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium leading-5">
                                                {dueCount} due
                                            </span>
                                        )}
                                    </div>
                                    {collection.description && (
                                        <p className="text-muted-foreground">
                                            {collection.description}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </main>
    )
}
