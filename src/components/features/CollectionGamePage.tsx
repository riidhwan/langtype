import { Link } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { ModePicker } from '@/components/features/ModePicker'
import { SRSAllDoneScreen } from '@/components/features/SRSAllDoneScreen'
import { SRSProgressView } from '@/components/features/SRSProgressView'
import { SRSQueuePanel } from '@/components/features/SRSQueuePanel'
import { TypingGame } from '@/components/features/TypingGame'
import { Button } from '@/components/ui/Button'
import { useSessionChallenges } from '@/hooks/useSessionChallenges'
import {
    isValidCustomCollection,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'
import { useSRSStore } from '@/store/useSRSStore'
import type { Challenge, Collection } from '@/types/challenge'

const EMPTY_CHALLENGES: Challenge[] = []

export type CollectionLoaderData =
    | { kind: 'bundled'; collection: Collection }
    | { kind: 'custom'; id: string }

export interface CollectionSearchState {
    questionId?: string | number
    mode?: 'normal' | 'srs'
    view?: 'progress'
}

interface Props {
    loaderData: CollectionLoaderData
    search: CollectionSearchState
    onGoToPicker: () => void
    onStartNormal: () => void
    onStartSRS: () => void
    onGoToProgress: () => void
    onQuestionChange: (newId: string) => void
}

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

export function CollectionGamePage({
    loaderData,
    search,
    onGoToPicker,
    onStartNormal,
    onStartSRS,
    onGoToProgress,
    onQuestionChange,
}: Props) {
    const { questionId, mode, view } = search
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

    if (view === 'progress') {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <Button
                    variant="link"
                    onClick={onGoToPicker}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 no-underline"
                    title="Back"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
                </Button>
                <SRSProgressView collection={collection} onBack={onGoToPicker} />
            </main>
        )
    }

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
                    onSelectNormal={onStartNormal}
                    onSelectSRS={onStartSRS}
                    onViewProgress={onGoToProgress}
                />
            </main>
        )
    }

    if (mode === 'srs' && challenges.length === 0) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
                <Button
                    variant="link"
                    onClick={onGoToPicker}
                    className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 no-underline"
                    title="Back"
                >
                    <BackArrow />
                    <span className="sr-only md:not-sr-only text-sm font-medium">Back</span>
                </Button>
                <SRSAllDoneScreen
                    collectionId={collection.id}
                    challenges={collection.challenges ?? []}
                    onBack={onGoToPicker}
                />
            </main>
        )
    }

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-start md:justify-center px-4 pb-4 pt-20 md:p-24 bg-background">
            <Button
                variant="link"
                onClick={onGoToPicker}
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
                onQuestionChange={onQuestionChange}
                onFinished={mode === 'srs' ? onGoToPicker : undefined}
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
