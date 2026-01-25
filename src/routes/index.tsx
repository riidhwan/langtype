import { createFileRoute, Link } from '@tanstack/react-router'
import { getCollections } from '@/services/challengeService'

export const Route = createFileRoute('/')({
    component: Home,
    loader: async () => {
        return await getCollections()
    },
})

function Home() {
    const collections = Route.useLoaderData()

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <div className="w-full max-w-4xl">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">LangType</h1>
                    <p className="text-xl text-muted-foreground">Select a collection to start practicing.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {collections.map((collection) => (
                        <Link
                            key={collection.id}
                            to="/collections/$id"
                            params={{ id: collection.id }}
                            className="block group"
                        >
                            <div className="border rounded-lg p-6 h-full transition-all hover:border-primary hover:shadow-md bg-card">
                                <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                                    {collection.title}
                                </h2>
                                {collection.description && (
                                    <p className="text-muted-foreground">
                                        {collection.description}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    )
}
