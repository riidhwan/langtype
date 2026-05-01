import { useEffect, useRef } from 'react'
import type { TypingStatus } from '@/hooks/useTypingEngine'

interface Props {
    currentIndex: number
    hasSRSContext: boolean
    status: TypingStatus
    timeLeft: number
    reinsertCurrentChallenge: (currentIndex: number) => void
}

export function useTypingRetryReinsertion({
    currentIndex,
    hasSRSContext,
    status,
    timeLeft,
    reinsertCurrentChallenge,
}: Props) {
    const hasReinsertedRef = useRef(false)

    useEffect(() => {
        hasReinsertedRef.current = false
    }, [currentIndex])

    useEffect(() => {
        if (hasSRSContext) return
        if (status !== 'submitted' || timeLeft !== 0) return
        if (hasReinsertedRef.current) return

        hasReinsertedRef.current = true
        reinsertCurrentChallenge(currentIndex)
    }, [currentIndex, hasSRSContext, reinsertCurrentChallenge, status, timeLeft])
}
