import { useState } from 'react'
import { Collection } from '@/types/challenge'
import { useSRSStore } from '@/store/useSRSStore'
import { getDueChallengeIds, getNextReviewTime } from '@/lib/srsAlgorithm'
import { cn } from '@/lib/utils'
import { IconChevronRight } from '@/components/ui/icons'

interface Props {
    collection: Collection
    onSelectNormal: () => void
    onSelectSRS: () => void
    onViewProgress: () => void
}

export function ModePicker({ collection, onSelectNormal, onSelectSRS, onViewProgress }: Props) {
    const cards = useSRSStore((s) => s.cards)
    const hasHydrated = useSRSStore((s) => s._hasHydrated)
    const resetCollection = useSRSStore((s) => s.resetCollection)

    const [confirmingReset, setConfirmingReset] = useState(false)

    const challengeIds = (collection.challenges ?? []).map((c) => c.id)
    const now = Date.now()

    const dueCount = hasHydrated
        ? getDueChallengeIds(collection.id, challengeIds, cards, now).length
        : 0

    const nextReviewTime = hasHydrated
        ? getNextReviewTime(collection.id, challengeIds, cards, now)
        : null

    const msUntilNext = nextReviewTime ? nextReviewTime - now : null
    const hoursUntil = msUntilNext ? Math.ceil(msUntilNext / 3_600_000) : null

    const totalCount = collection.challenges?.length ?? 0

    const hasProgress = hasHydrated &&
        Object.keys(cards).some((k) => k.startsWith(`${collection.id}:`))

    const handleReset = () => {
        resetCollection(collection.id)
        setConfirmingReset(false)
    }

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">{collection.title}</h1>
                {collection.description && (
                    <p className="text-muted-foreground">{collection.description}</p>
                )}
            </div>

            <p className="mono-label">How would you like to practice?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button
                    onClick={onSelectNormal}
                    className="flex items-center justify-between gap-4 w-full rounded-[var(--radius)] border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-[var(--bg2)] cursor-pointer"
                >
                    <div>
                        <span className="text-[15px] font-semibold block mb-1">Practice All</span>
                        <span className="text-sm text-muted-foreground">
                            {totalCount} {totalCount === 1 ? 'challenge' : 'challenges'} in random order
                        </span>
                    </div>
                    <IconChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                <button
                    onClick={dueCount > 0 ? onSelectSRS : undefined}
                    disabled={dueCount === 0}
                    className={cn(
                        'flex items-center justify-between gap-4 w-full rounded-[var(--radius)] border bg-card p-5 text-left transition-colors',
                        dueCount > 0
                            ? 'border-border hover:border-primary hover:bg-[var(--bg2)] cursor-pointer'
                            : 'border-border opacity-45 cursor-not-allowed',
                    )}
                >
                    <div>
                        <span className="text-[15px] font-semibold block mb-1">Spaced Repetition</span>
                        <span className="text-sm text-muted-foreground">
                            {dueCount > 0
                                ? `${dueCount} ${dueCount === 1 ? 'card' : 'cards'} due for review`
                                : hoursUntil && hoursUntil > 0
                                    ? `Next review in ${hoursUntil}h`
                                    : 'All caught up'}
                        </span>
                    </div>
                    {dueCount > 0 && <IconChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
            </div>

            <button
                onClick={onViewProgress}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"
            >
                View progress
            </button>

            {hasProgress && (
                <div className="text-sm text-muted-foreground">
                    {confirmingReset ? (
                        <span className="flex items-center gap-3">
                            <span>Reset SRS progress for this collection?</span>
                            <button
                                onClick={handleReset}
                                className="text-[var(--incorrect)] hover:opacity-80 font-medium transition-opacity"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setConfirmingReset(false)}
                                className="underline underline-offset-4 cursor-pointer hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                        </span>
                    ) : (
                        <button
                            onClick={() => setConfirmingReset(true)}
                            className="underline underline-offset-4 cursor-pointer hover:text-foreground transition-colors"
                        >
                            Reset SRS progress
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
