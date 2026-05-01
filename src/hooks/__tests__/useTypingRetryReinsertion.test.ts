import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTypingRetryReinsertion } from '../useTypingRetryReinsertion'
import type { TypingStatus } from '@/hooks/useTypingEngine'

interface HookProps {
    currentIndex: number
    hasSRSContext: boolean
    status: TypingStatus
    timeLeft: number
    reinsertCurrentChallenge: (currentIndex: number) => void
}

describe('useTypingRetryReinsertion', () => {
    it('reinserts a normal-mode wrong answer once after the timer expires', () => {
        const reinsertCurrentChallenge = vi.fn()

        const { rerender } = renderHook((props: HookProps) => useTypingRetryReinsertion(props), {
            initialProps: {
                currentIndex: 0,
                hasSRSContext: false,
                status: 'submitted',
                timeLeft: 1,
                reinsertCurrentChallenge,
            },
        })

        rerender({
            currentIndex: 0,
            hasSRSContext: false,
            status: 'submitted',
            timeLeft: 0,
            reinsertCurrentChallenge,
        })
        rerender({
            currentIndex: 0,
            hasSRSContext: false,
            status: 'submitted',
            timeLeft: 0,
            reinsertCurrentChallenge,
        })

        expect(reinsertCurrentChallenge).toHaveBeenCalledOnce()
        expect(reinsertCurrentChallenge).toHaveBeenCalledWith(0)
    })

    it('does not handle reinsertion in SRS mode', () => {
        const reinsertCurrentChallenge = vi.fn()

        renderHook(() => useTypingRetryReinsertion({
            currentIndex: 0,
            hasSRSContext: true,
            status: 'submitted',
            timeLeft: 0,
            reinsertCurrentChallenge,
        }))

        expect(reinsertCurrentChallenge).not.toHaveBeenCalled()
    })
})
