import { useCallback, useEffect, useRef, useState } from 'react'
import { useSRSStore } from '@/store/useSRSStore'
import { SRS_INTERVAL_DAYS, type SRSIntervalChoice } from '@/types/srs'
import type { Challenge } from '@/types/challenge'
import type { TypingStatus } from '@/hooks/useTypingEngine'

interface SRSContext {
    collectionId: string
    skipRecording?: boolean
}

interface Props {
    status: TypingStatus
    timeLeft: number
    currentIndex: number
    currentChallenge?: Challenge
    srsContext?: SRSContext
    isCorrect: boolean
    setIsPaused: (isPaused: boolean) => void
    setTimeLeft: (timeLeft: number) => void
    reinsertCurrentChallenge: (currentIndex: number) => void
}

export const SRS_INTERVAL_ORDER: SRSIntervalChoice[] = ['asap', '1h', '3h', '6h', '12h', '1d', '3d', '1w', '2w']

export function useSRSReviewRecording({
    status,
    timeLeft,
    currentIndex,
    currentChallenge,
    srsContext,
    isCorrect,
    setIsPaused,
    setTimeLeft,
    reinsertCurrentChallenge,
}: Props) {
    const [intervalChoice, setIntervalChoice] = useState<SRSIntervalChoice | null>(null)
    const recordReview = useSRSStore((s) => s.recordReview)
    const recordReviewWithInterval = useSRSStore((s) => s.recordReviewWithInterval)
    const hasRecordedRef = useRef(false)

    useEffect(() => {
        setIntervalChoice(null)
    }, [currentIndex])

    const showingIntervalPills =
        isCorrect && !!srsContext && !srsContext.skipRecording && intervalChoice === null

    useEffect(() => {
        setIsPaused(showingIntervalPills)
    }, [setIsPaused, showingIntervalPills])

    const handleIntervalClick = useCallback((choice: SRSIntervalChoice) => {
        setIntervalChoice(choice)
        setIsPaused(false)
        setTimeLeft(2)
    }, [setIsPaused, setTimeLeft])

    useEffect(() => {
        if (!showingIntervalPills) return

        const handler = (event: KeyboardEvent) => {
            const shortcut = Number.parseInt(event.key)
            if (shortcut >= 1 && shortcut <= SRS_INTERVAL_ORDER.length) {
                handleIntervalClick(SRS_INTERVAL_ORDER[shortcut - 1])
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handleIntervalClick, showingIntervalPills])

    useEffect(() => {
        if (status === 'typing') {
            hasRecordedRef.current = false
            return
        }
        if (!currentChallenge || !srsContext || hasRecordedRef.current) return
        if (status !== 'completed' && status !== 'submitted') return
        if (timeLeft !== 0) return

        hasRecordedRef.current = true

        if (status === 'submitted') {
            if (!srsContext.skipRecording) {
                recordReview(srsContext.collectionId, currentChallenge.id, 'incorrect')
            }
            reinsertCurrentChallenge(currentIndex)
            return
        }

        const choice = intervalChoice ?? '1d'
        const intervalDays = SRS_INTERVAL_DAYS[choice]
        if (!srsContext.skipRecording) {
            recordReviewWithInterval(srsContext.collectionId, currentChallenge.id, intervalDays)
        }
        if (intervalDays === 0) {
            reinsertCurrentChallenge(currentIndex)
        }
    }, [
        currentChallenge,
        currentIndex,
        intervalChoice,
        recordReview,
        recordReviewWithInterval,
        reinsertCurrentChallenge,
        srsContext,
        status,
        timeLeft,
    ])

    return {
        intervalChoice,
        showingIntervalPills,
        handleIntervalClick,
    }
}
