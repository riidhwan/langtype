import { useEffect, useRef, useState } from 'react'
import type { Challenge } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import { getDueChallengeIds } from '@/lib/srsAlgorithm'
import { shuffleArray } from '@/lib/utils'

type CollectionMode = 'normal' | 'srs' | undefined

interface UseSessionChallengesProps {
    collectionId: string
    mode: CollectionMode
    allChallenges: Challenge[]
    cards: Record<string, SRSCard>
    srsHasHydrated: boolean
}

export function useSessionChallenges({
    collectionId,
    mode,
    allChallenges,
    cards,
    srsHasHydrated,
}: UseSessionChallengesProps) {
    const cardsRef = useRef(cards)
    const srsHydrationKey = mode === 'srs' ? srsHasHydrated : true
    const sessionRef = useRef({ collectionId, mode, allChallenges, srsHydrationKey })
    cardsRef.current = cards

    const [challenges, setChallenges] = useState(() =>
        buildSessionChallenges(collectionId, mode, allChallenges, cards, srsHasHydrated)
    )

    useEffect(() => {
        const previousSession = sessionRef.current
        if (
            previousSession.collectionId === collectionId &&
            previousSession.mode === mode &&
            previousSession.allChallenges === allChallenges &&
            previousSession.srsHydrationKey === srsHydrationKey
        ) {
            return
        }

        sessionRef.current = { collectionId, mode, allChallenges, srsHydrationKey }
        setChallenges(buildSessionChallenges(collectionId, mode, allChallenges, cardsRef.current, srsHasHydrated))
    }, [collectionId, mode, allChallenges, srsHasHydrated, srsHydrationKey])

    return challenges
}

function buildSessionChallenges(
    collectionId: string,
    mode: CollectionMode,
    allChallenges: Challenge[],
    cards: Record<string, SRSCard>,
    srsHasHydrated: boolean,
) {
    if (mode === 'srs' && !srsHasHydrated) return []

    if (mode === 'srs') {
        const dueIds = getDueChallengeIds(collectionId, allChallenges.map((c) => c.id), cards)
        return shuffleArray(allChallenges.filter((c) => dueIds.includes(c.id)))
    }
    if (mode === 'normal') return shuffleArray(allChallenges)
    return []
}
