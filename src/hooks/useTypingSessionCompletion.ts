import { RefObject, useEffect, useRef } from 'react'
import type { Challenge } from '@/types/challenge'
import type { TypingStatus } from '@/hooks/useTypingEngine'

interface Props {
    challenges: Challenge[]
    currentIndex: number
    pendingReinsertRef: RefObject<boolean>
    sessionQueueLength: number
    status: TypingStatus
    timeLeft: number
    onFinished?: () => void
}

export function useTypingSessionCompletion({
    challenges,
    currentIndex,
    pendingReinsertRef,
    sessionQueueLength,
    status,
    timeLeft,
    onFinished,
}: Props) {
    const hasCalledOnFinished = useRef(false)

    useEffect(() => {
        hasCalledOnFinished.current = false
    }, [challenges])

    useEffect(() => {
        if (
            onFinished &&
            !hasCalledOnFinished.current &&
            !pendingReinsertRef.current &&
            status !== 'typing' &&
            timeLeft === 0 &&
            sessionQueueLength > 0 &&
            currentIndex === sessionQueueLength - 1
        ) {
            hasCalledOnFinished.current = true
            onFinished()
        }
    }, [currentIndex, onFinished, pendingReinsertRef, sessionQueueLength, status, timeLeft])
}
