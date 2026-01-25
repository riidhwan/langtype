import { createFileRoute, notFound } from '@tanstack/react-router'
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

function CollectionGamePage() {
    const collection = Route.useLoaderData()

    const challenges = useMemo(() => {
        return shuffleArray(collection.challenges || [])
    }, [collection.challenges])

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
            <div className="mb-4 text-center">
                <h2 className="text-xl text-muted-foreground">{collection.title}</h2>
            </div>
            <TypingGame challenges={challenges} />
        </main>
    )
}
