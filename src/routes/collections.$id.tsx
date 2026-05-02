import { createFileRoute, notFound, Link, useNavigate } from '@tanstack/react-router'
import { getCollection } from '@/services/challengeService'
import { TypingGame } from '@/components/features/TypingGame'
import { ModePicker } from '@/components/features/ModePicker'
import { SRSAllDoneScreen } from '@/components/features/SRSAllDoneScreen'
import { SRSProgressView } from '@/components/features/SRSProgressView'
import { SRSQueuePanel } from '@/components/features/SRSQueuePanel'
import { useEffect, useMemo } from 'react'
import { useSRSStore } from '@/store/useSRSStore'
import {
    isCustomCollectionId,
    isValidCustomCollection,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'
import { useSessionChallenges } from '@/hooks/useSessionChallenges'
import { Button } from '@/components/ui/Button'
import type { Challenge, Collection } from '@/types/challenge'

const EMPTY_CHALLENGES: Challenge[] = []

type CollectionLoaderData =
    | { kind: 'bundled'; collection: Collection }
    | { kind: 'custom'; id: string }

export const Route = createFileRoute('/collections/$id')({
    component: CollectionGamePage,
    loader: async ({ params }) => {
        if (isCustomCollectionId(params.id)) {
            return { kind: 'custom' as const, id: params.id }
        }

        const collection = await getCollection(params.id)
        if (!collection) {
            throw notFound()
        }
        return { kind: 'bundled' as const, collection }
    },
    validateSearch: (search: Record<string, unknown>): { questionId?: string | number; mode?: 'normal' | 'srs'; view?: 'progress' } => {
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

        const view = search.view === 'progress' ? ('progress' as const) : undefined

        return { questionId, mode, view }
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
    const loaderData = Route.useLoaderData() as CollectionLoaderData
    const { questionId, mode, view } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const cards = useSRSStore((s) => s.cards)
    const recordPlay = useSRSStore((s) => s.recordPlay)
    const customCollection = useCustomCollectionsStore((s) => (
        loaderData.kind === 'custom' ? s.collections[loaderData.id] : undefined
    ))
    const customHasHydrated = useCustomCollectionsStore((s) => s._hasHydrated)

    const collection = useMemo(() => {
        if (loaderData.kind === 'bundled') {
            return loaderData.collection
        }

        if (!customCollection || !isValidCustomCollection(customCollection)) {
            return undefined
        }

        return toPlayableCollection(customCollection)
    }, [customCollection, loaderData])
    const collectionId = collection?.id

    const allChallenges = collection?.challenges ?? EMPTY_CHALLENGES
    const challenges = useSessionChallenges({
        collectionId: collectionId ?? '',
        mode,
        allChallenges,
        cards,
    })

    useEffect(() => {
        if (collectionId && (mode === 'srs' || mode === 'normal')) {
            recordPlay(collectionId)
        }
    }, [mode, collectionId, recordPlay])

    const goToPicker = () => navigate({ search: () => ({}) })
    const startNormal = () => navigate({ search: () => ({ mode: 'normal' as const }) })
    const startSRS = () => navigate({ search: () => ({ mode: 'srs' as const }) })
    const goToProgress = () => navigate({ search: () => ({ view: 'progress' as const }) })

    if (loaderData.kind === 'custom' && !customHasHydrated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
                Loading collection...
            </main>
        )
    }

    if (!collection) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
                <h1 className="text-2xl font-bold">Collection not found</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                    This custom collection is not saved or is not playable on this device.
                </p>
                <Link
                    to="/"
                    className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary"
                >
                    Home
                </Link>
            </main>
        )
    }

    // Progress view
    if (view === 'progress') {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <Button
                    variant="link"
                    onClick={goToPicker}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 no-underline"
                    title="Back"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
                </Button>
                <SRSProgressView collection={collection} onBack={goToPicker} />
            </main>
        )
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
                    onViewProgress={goToProgress}
                />
            </main>
        )
    }

    // SRS all-done screen
    if (mode === 'srs' && challenges.length === 0) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <Button
                    variant="link"
                    onClick={goToPicker}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 no-underline"
                    title="Back"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
                </Button>
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
            <Button
                variant="link"
                onClick={goToPicker}
                className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 no-underline"
                title="Back"
            >
                <BackArrow />
                <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
            </Button>
            <div className="mb-4 text-center">
                <h2 className="text-xl text-muted-foreground">{collection.title}</h2>
            </div>
            <TypingGame
                key={mode}
                challenges={challenges}
                freeInput={collection.freeInput}
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
                onFinished={mode === 'srs' ? goToPicker : undefined}
                srsContext={mode === 'srs' ? { collectionId: collection.id } : undefined}
            />
            {mode === 'srs' && (
                <SRSQueuePanel
                    collectionId={collection.id}
                    allChallenges={collection.challenges ?? []}
                />
            )}
        </main>
    )
}
