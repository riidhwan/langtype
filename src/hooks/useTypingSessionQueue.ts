import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REINSERT_MAX, REINSERT_MIN } from '@/config'
import type { Challenge } from '@/types/challenge'

function reinsertChallenge(queue: Challenge[], fromIndex: number, challenge: Challenge): Challenge[] {
    const range = REINSERT_MAX - REINSERT_MIN + 1
    const offset = Math.floor(Math.random() * range) + REINSERT_MIN
    const insertAt = Math.min(fromIndex + offset, queue.length)
    const next = [...queue]
    next.splice(insertAt, 0, challenge)
    return next
}

export function useTypingSessionQueue(challenges: Challenge[]) {
    const [sessionQueue, setSessionQueue] = useState<Challenge[]>(challenges)
    const pendingReinsertRef = useRef(false)

    useEffect(() => {
        setSessionQueue(challenges)
        pendingReinsertRef.current = false
    }, [challenges])

    useEffect(() => {
        pendingReinsertRef.current = false
    }, [sessionQueue])

    const translations = useMemo(() => sessionQueue.map((challenge) => challenge.translation), [sessionQueue])

    const reinsertCurrentChallenge = useCallback((currentIndex: number) => {
        pendingReinsertRef.current = true
        setSessionQueue((prev) => reinsertChallenge(prev, currentIndex, prev[currentIndex]))
    }, [])

    return {
        sessionQueue,
        translations,
        pendingReinsertRef,
        reinsertCurrentChallenge,
    }
}
