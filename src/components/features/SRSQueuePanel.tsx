import { useState, useRef, useEffect, useMemo } from 'react'
import { useSRSStore } from '@/store/useSRSStore'
import { getQueueLoadBuckets, getAllCollectionsQueueLoadBuckets } from '@/lib/srsAlgorithm'
import { IconClock } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import type { Challenge } from '@/types/challenge'

interface Props {
    collectionId?: string
    allChallenges?: Challenge[]
}

export function SRSQueuePanel({ collectionId, allChallenges }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const cards = useSRSStore((s) => s.cards)

    const challengeIds = useMemo(
        () => allChallenges?.map((c) => c.id) ?? [],
        [allChallenges]
    )

    const showHereColumn = !!collectionId && !!allChallenges

    const buckets = useMemo(
        () => showHereColumn ? getQueueLoadBuckets(collectionId!, challengeIds, cards) : [],
        [showHereColumn, collectionId, challengeIds, cards]
    )

    const allBuckets = useMemo(
        () => getAllCollectionsQueueLoadBuckets(cards),
        [cards]
    )

    useEffect(() => {
        if (!isOpen) return
        const handler = (e: PointerEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('pointerdown', handler)
        return () => document.removeEventListener('pointerdown', handler)
    }, [isOpen])

    return (
        <div ref={panelRef} className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
            {isOpen && (
                <div className="rounded-[var(--radius)] border border-border bg-card px-4 py-3 min-w-[128px]">
                    <p className="mono-label mb-3">Upcoming</p>
                    <table className="w-full">
                        {showHereColumn && (
                            <thead>
                                <tr>
                                    <th></th>
                                    <th className="font-mono text-[10px] text-muted-foreground text-right pb-1.5 whitespace-nowrap">here</th>
                                    <th className="font-mono text-[10px] text-muted-foreground text-right pb-1.5 pl-4 whitespace-nowrap">all</th>
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {allBuckets.map(({ label, count }, i) => (
                                <tr key={label}>
                                    <td className="font-mono text-[13px] text-muted-foreground pr-4 py-0.5 whitespace-nowrap">
                                        {label}
                                    </td>
                                    {showHereColumn && (
                                        <td className={cn(
                                            'font-mono text-[13px] text-right tabular-nums',
                                            buckets[i].count === 0 ? 'text-muted-foreground' : 'text-foreground'
                                        )}>
                                            {buckets[i].count}
                                        </td>
                                    )}
                                    <td className={cn(
                                        'font-mono text-[13px] text-right tabular-nums',
                                        showHereColumn && 'pl-4',
                                        count === 0 ? 'text-muted-foreground' : 'text-foreground'
                                    )}>
                                        {count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={isOpen ? 'Close queue panel' : 'View upcoming queue load'}
                aria-expanded={isOpen}
                className={cn(
                    'p-2 rounded-full border bg-card transition-colors',
                    isOpen
                        ? 'border-primary text-foreground bg-[var(--bg3)]'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-primary'
                )}
            >
                <IconClock />
            </button>
        </div>
    )
}
