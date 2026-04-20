import { createFileRoute, notFound, Link, useNavigate } from '@tanstack/react-router'
import { getCollection } from '@/services/challengeService'
import { TypingGame } from '@/components/features/TypingGame'
import { ModePicker } from '@/components/features/ModePicker'
import { SRSAllDoneScreen } from '@/components/features/SRSAllDoneScreen'
import { useMemo, useRef, useState } from 'react'
import { shuffleArray } from '@/lib/utils'
import { useSRSStore } from '@/store/useSRSStore'
import { getDueChallengeIds } from '@/lib/srsAlgorithm'

export const Route = createFileRoute('/collections/$id')({
    component: CollectionGamePage,
    loader: async ({ params }) => {
        const collection = await getCollection(params.id)
        if (!collection) {
            throw notFound()
        }
        return collection
    },
    validateSearch: (search: Record<string, unknown>): { questionId?: string | number; mode?: 'normal' | 'srs' } => {
        const raw = search.questionId

        let questionId: string | number | undefined
        if (typeof raw === 'number') {
            questionId = raw
        } else if (typeof raw === 'string') {
            let qId = raw
            if (qId.startsWith('"') && qId.endsWith('"')) {
                qId = qId.slice(1, -1)
            }
            const num = Number(qId)
            if (!isNaN(num) && qId.trim() !== '') {
                questionId = num
            } else {
                questionId = qId
            }
        }

        const rawMode = search.mode
        const mode = rawMode === 'srs' ? 'srs' : rawMode === 'normal' ? 'normal' : undefined

        return { questionId, mode }
    },
})

const BackArrow = () => (
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
)

export function CollectionGamePage() {
    const collection = Route.useLoaderData()
    const { questionId, mode } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const { cards } = useSRSStore()

    const [retryCount, setRetryCount] = useState(0)
    const [missedIds, setMissedIds] = useState<string[]>([])
    const pendingMissedIds = useRef<string[]>([])
    const isRetryPhase = retryCount > 0

    // Snapshot challenges at session start.
    // cards is intentionally excluded from deps to prevent mid-session
    // list changes that would break currentIndex in useTypingEngine.
    // retryCount and missedIds are intentionally included — they represent
    // deliberate phase transitions, not background changes.
    const challenges = useMemo(() => {
        const all = collection.challenges ?? []
        if (mode === 'srs') {
            if (isRetryPhase) {
                return shuffleArray(all.filter((c) => missedIds.includes(c.id)))
            }
            const dueIds = getDueChallengeIds(collection.id, all.map((c) => c.id), cards)
            return shuffleArray(all.filter((c) => dueIds.includes(c.id)))
        }
        if (mode === 'normal') {
            return shuffleArray(all)
        }
        return []
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collection.challenges, collection.id, mode, retryCount, missedIds])

    const goToPicker = () => {
        setRetryCount(0)
        setMissedIds([])
        pendingMissedIds.current = []
        navigate({ search: () => ({}) })
    }
    const startNormal = () => navigate({ search: () => ({ mode: 'normal' as const }) })
    const startSRS = () => navigate({ search: () => ({ mode: 'srs' as const }) })

    const handleCardResult = (challengeId: string, passed: boolean) => {
        if (!passed) pendingMissedIds.current.push(challengeId)
    }

    const handleFinished = () => {
        const missed = pendingMissedIds.current
        pendingMissedIds.current = []
        if (missed.length > 0) {
            setMissedIds(missed)
            setRetryCount((c) => c + 1)
        } else {
            setRetryCount(0)
            setMissedIds([])
            goToPicker()
        }
    }

    // Mode picker — no mode selected yet
    if (mode === undefined) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <Link
                    to="/"
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Back to Home"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Home</span>
                </Link>
                <ModePicker
                    collection={collection}
                    onSelectNormal={startNormal}
                    onSelectSRS={startSRS}
                />
            </main>
        )
    }

    // SRS all-done screen
    if (mode === 'srs' && challenges.length === 0) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <button
                    onClick={goToPicker}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Back"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
                </button>
                <SRSAllDoneScreen
                    collectionId={collection.id}
                    challenges={collection.challenges ?? []}
                    onBack={goToPicker}
                />
            </main>
        )
    }

    // Game
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
            <button
                onClick={goToPicker}
                className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Back"
            >
                <BackArrow />
                <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
            </button>
            <div className="mb-4 text-center">
                <h2 className="text-xl text-muted-foreground">{collection.title}</h2>
            </div>
            <TypingGame
                key={`${mode}-${retryCount}`}
                challenges={challenges}
                initialQuestionId={questionId ? String(questionId) : undefined}
                onQuestionChange={(newId) => {
                    const numericId = Number(newId)
                    const isNumeric = !isNaN(numericId) && newId.trim() !== ''
                    navigate({
                        search: (prev) => ({
                            ...prev,
                            questionId: isNumeric ? numericId : newId,
                        }),
                        replace: true,
                    })
                }}
                onFinished={mode === 'srs' ? handleFinished : undefined}
                srsContext={mode === 'srs' ? {
                    collectionId: collection.id,
                    totalDue: challenges.length,
                    isRetry: isRetryPhase,
                    skipRecording: isRetryPhase,
                    onCardResult: handleCardResult,
                } : undefined}
            />
        </main>
    )
}
