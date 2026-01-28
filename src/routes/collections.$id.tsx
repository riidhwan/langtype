import { createFileRoute, notFound, Link, useNavigate } from '@tanstack/react-router'
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
    validateSearch: (search: Record<string, unknown>): { questionId?: string | number } => {
        const raw = search.questionId

        // If it's already a number (e.g. from JSON state or clean URL parsing if router supports it), return it.
        if (typeof raw === 'number') {
            return { questionId: raw }
        }

        if (typeof raw === 'string') {
            let qId = raw
            // Strip quotes if they exist (handling double-encoding or legacy format)
            if (qId.startsWith('"') && qId.endsWith('"')) {
                qId = qId.slice(1, -1)
            }
            // Try to parse as number to keep URL clean if possible
            const num = Number(qId)
            if (!isNaN(num) && qId.trim() !== '') {
                return { questionId: num }
            }
            return { questionId: qId }
        }

        return { questionId: undefined }
    },
})

export function CollectionGamePage() {
    const collection = Route.useLoaderData()
    const { questionId } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })

    const challenges = useMemo(() => {
        return shuffleArray(collection.challenges || [])
    }, [collection.challenges])

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
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
            <TypingGame
                challenges={challenges}
                initialQuestionId={questionId ? String(questionId) : undefined}
                onQuestionChange={(newId) => {
                    const numericId = Number(newId)
                    const isNumeric = !isNaN(numericId) && newId.trim() !== ''
                    navigate({
                        search: { questionId: isNumeric ? numericId : newId },
                        replace: true,
                    })
                }}
            />
        </main>
    )
}
