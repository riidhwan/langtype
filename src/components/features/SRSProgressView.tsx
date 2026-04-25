import { useSRSStore } from '@/store/useSRSStore'
import { isCardDue } from '@/lib/srsAlgorithm'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import type { Challenge } from '@/types/challenge'

interface Props {
    collection: Collection
    onBack: () => void
}

type CardStatus =
    | { type: 'due'; card: SRSCard }
    | { type: 'new' }
    | { type: 'upcoming'; card: SRSCard; msUntil: number }

export function getCardStatus(
    challenge: Challenge,
    collectionId: string,
    cards: Record<string, SRSCard>,
    now: number,
): CardStatus {
    const card = cards[`${collectionId}:${challenge.id}`]
    if (!card || card.lastReviewedAt === 0) return { type: 'new' }
    if (isCardDue(card, now)) return { type: 'due', card }
    return { type: 'upcoming', card, msUntil: card.nextReviewAt - now }
}

export function formatTimeUntil(ms: number): string {
    const hours = ms / 3_600_000
    if (hours < 1) return 'in <1h'
    if (hours < 24) return `in ${Math.ceil(hours)}h`
    return `in ${Math.ceil(hours / 24)}d`
}

export function SRSProgressView({ collection, onBack: _onBack }: Props) {
    const cards = useSRSStore((s) => s.cards)
    const hasHydrated = useSRSStore((s) => s._hasHydrated)

    const challenges = collection.challenges ?? []
    const now = Date.now()

    const due: Challenge[] = []
    const newCards: Challenge[] = []
    const upcoming: Array<{ challenge: Challenge; msUntil: number }> = []

    if (hasHydrated) {
        for (const challenge of challenges) {
            const status = getCardStatus(challenge, collection.id, cards, now)
            if (status.type === 'due') due.push(challenge)
            else if (status.type === 'new') newCards.push(challenge)
            else upcoming.push({ challenge, msUntil: status.msUntil })
        }
        upcoming.sort((a, b) => a.msUntil - b.msUntil)
    }

    return (
        <div className="w-full max-w-2xl flex flex-col gap-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">{collection.title}</h1>
                <p className="text-muted-foreground">Card progress</p>
            </div>

            {!hasHydrated ? (
                <p className="text-center text-muted-foreground text-sm">Loading...</p>
            ) : challenges.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">No cards in this collection.</p>
            ) : (
                <>
                    {/* Summary pills */}
                    <div className="flex gap-2 flex-wrap mb-2">
                        {due.length > 0 && (
                            <span className="font-mono text-xs font-semibold text-[var(--incorrect)] bg-[var(--incorrect-bg)] rounded-full px-3 py-1">
                                {due.length} due
                            </span>
                        )}
                        {newCards.length > 0 && (
                            <span className="font-mono text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
                                {newCards.length} new
                            </span>
                        )}
                        {upcoming.length > 0 && (
                            <span className="font-mono text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
                                {upcoming.length} upcoming
                            </span>
                        )}
                    </div>

                    {/* Due section */}
                    {due.length > 0 && (
                        <section>
                            <h2 className="mono-label mb-3">
                                Due ({due.length})
                            </h2>
                            <ul className="flex flex-col divide-y divide-border">
                                {due.map((c) => (
                                    <li key={c.id} className="flex items-center justify-between px-3 py-3">
                                        <span className="text-foreground">{c.original ?? c.translation}</span>
                                        <span className="font-mono text-[11px] text-[var(--incorrect)] shrink-0 ml-4">Due</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* New section */}
                    {newCards.length > 0 && (
                        <section>
                            <h2 className="mono-label mb-3">
                                New ({newCards.length})
                            </h2>
                            <ul className="flex flex-col divide-y divide-border">
                                {newCards.map((c) => (
                                    <li key={c.id} className="flex items-center justify-between px-3 py-3">
                                        <span className="text-foreground">{c.original ?? c.translation}</span>
                                        <span className="font-mono text-[11px] text-muted-foreground shrink-0 ml-4">New</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Upcoming section */}
                    {upcoming.length > 0 && (
                        <section>
                            <h2 className="mono-label mb-3">
                                Upcoming ({upcoming.length})
                            </h2>
                            <ul className="flex flex-col divide-y divide-border">
                                {upcoming.map(({ challenge, msUntil }) => (
                                    <li key={challenge.id} className="flex items-center justify-between px-3 py-3">
                                        <span className="text-foreground">{challenge.original ?? challenge.translation}</span>
                                        <span className="font-mono text-[11px] text-muted-foreground shrink-0 ml-4">
                                            {formatTimeUntil(msUntil)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            )}
        </div>
    )
}
