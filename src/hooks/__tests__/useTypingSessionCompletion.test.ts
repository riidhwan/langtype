import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { useTypingSessionCompletion } from '../useTypingSessionCompletion'
import type { Challenge } from '@/types/challenge'
import type { TypingStatus } from '@/hooks/useTypingEngine'

interface HookProps {
    challenges: Challenge[]
    currentIndex: number
    pendingReinsert: boolean
    sessionQueueLength: number
    status: TypingStatus
    timeLeft: number
    onFinished: () => void
}

function useCompletionHarness({
    challenges,
    currentIndex,
    pendingReinsert,
    sessionQueueLength,
    status,
    timeLeft,
    onFinished,
}: HookProps) {
    const pendingReinsertRef = useRef(pendingReinsert)
    pendingReinsertRef.current = pendingReinsert

    useTypingSessionCompletion({
        challenges,
        currentIndex,
        pendingReinsertRef,
        sessionQueueLength,
        status,
        timeLeft,
        onFinished,
    })
}

describe('useTypingSessionCompletion', () => {
    const challenges: Challenge[] = [
        { id: '1', translation: 'Hallo' },
    ]

    it('calls onFinished once when the last card has completed its timer', () => {
        const onFinished = vi.fn()

        const { rerender } = renderHook((props: HookProps) => useCompletionHarness(props), {
            initialProps: {
                challenges,
                currentIndex: 0,
                pendingReinsert: false,
                sessionQueueLength: 1,
                status: 'typing',
                timeLeft: 0,
                onFinished,
            },
        })

        rerender({
            challenges,
            currentIndex: 0,
            pendingReinsert: false,
            sessionQueueLength: 1,
            status: 'completed',
            timeLeft: 0,
            onFinished,
        })
        rerender({
            challenges,
            currentIndex: 0,
            pendingReinsert: false,
            sessionQueueLength: 1,
            status: 'completed',
            timeLeft: 0,
            onFinished,
        })

        expect(onFinished).toHaveBeenCalledOnce()
    })

    it('does not finish while a reinsertion is pending', () => {
        const onFinished = vi.fn()

        renderHook(() => useCompletionHarness({
            challenges,
            currentIndex: 0,
            pendingReinsert: true,
            sessionQueueLength: 1,
            status: 'submitted',
            timeLeft: 0,
            onFinished,
        }))

        expect(onFinished).not.toHaveBeenCalled()
    })
})
