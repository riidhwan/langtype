import { useEffect, useState } from 'react'
import { Challenge } from '@/types/challenge'
import { useSRSStore } from '@/store/useSRSStore'
import { getNextReviewTime } from '@/lib/srsAlgorithm'

interface Props {
    collectionId: string
    challenges: Challenge[]
    onBack: () => void
}

export function SRSAllDoneScreen({ collectionId, challenges, onBack }: Props) {
    const cards = useSRSStore((s) => s.cards)
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(interval)
    }, [])

    const nextReviewTime = getNextReviewTime(
        collectionId,
        challenges.map((c) => c.id),
        cards,
        now,
    )

    const msUntilNext = nextReviewTime ? nextReviewTime - now : null
    const hoursUntil = msUntilNext ? Math.ceil(msUntilNext / 3_600_000) : null

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-6 text-center py-12">
            <div className="text-5xl">✓</div>
            <h2 className="text-2xl font-bold">All caught up!</h2>
            <p className="text-muted-foreground">
                {hoursUntil && hoursUntil > 0
                    ? `Next cards due in ${hoursUntil} ${hoursUntil === 1 ? 'hour' : 'hours'}.`
                    : 'No more cards scheduled — check back tomorrow.'}
            </p>
            <button
                onClick={onBack}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
                Back to collection
            </button>
        </div>
    )
}
