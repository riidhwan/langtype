import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { getCollection } from '@/services/challengeService'
import { TypingGame } from '@/components/features/TypingGame'
import { useMemo } from 'react'
import { shuffleArray } from '@/lib/utils'

export const Route = createFileRoute('/collections/$id')({
    component: CollectionGamePage,
    loader: async ({ params }) => {
        const collection = await getCollection(params.id)
        if (!collection) {
            throw notFound()
        }
        return collection
    },
})

export function CollectionGamePage() {
    const collection = Route.useLoaderData()

    const challenges = useMemo(() => {
        return shuffleArray(collection.challenges || [])
    }, [collection.challenges])

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <Link
                to="/"
                className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Back to Home"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
                <span className="sr-only md:not-sr-only text-sm font-medium">Home</span>
            </Link>
            <div className="mb-4 text-center">
                <h2 className="text-xl text-muted-foreground">{collection.title}</h2>
            </div>
            <TypingGame challenges={challenges} />
        </main>
    )
}
