import { act, fireEvent, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSRSReviewRecording } from '../useSRSReviewRecording'
import type { Challenge } from '@/types/challenge'
import type { SRSStore } from '@/store/useSRSStore'
import type { TypingStatus } from '@/hooks/useTypingEngine'

const mockRecordReview = vi.hoisted(() => vi.fn())
const mockRecordReviewWithInterval = vi.hoisted(() => vi.fn())

const mockSRSState = vi.hoisted(() => ({
    cards: {},
    lastPlayedAt: {},
    _hasHydrated: true,
    recordReview: mockRecordReview,
    recordReviewWithInterval: mockRecordReviewWithInterval,
    recordPlay: vi.fn(),
    getCard: vi.fn(),
    resetCollection: vi.fn(),
    resetAll: vi.fn(),
    setHasHydrated: vi.fn(),
}) satisfies SRSStore)

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: SRSStore) => T) => selector(mockSRSState),
}))

interface HookProps {
    status: TypingStatus
    timeLeft: number
    currentIndex: number
    currentChallenge?: Challenge
    isCorrect: boolean
    setIsPaused: (isPaused: boolean) => void
    setTimeLeft: (timeLeft: number) => void
    reinsertCurrentChallenge: (currentIndex: number) => void
}

describe('useSRSReviewRecording', () => {
    const challenge: Challenge = { id: '1', translation: 'Hallo' }

    beforeEach(() => {
        mockRecordReview.mockClear()
        mockRecordReviewWithInterval.mockClear()
        mockSRSState.recordPlay.mockClear()
        mockSRSState.getCard.mockClear()
        mockSRSState.resetCollection.mockClear()
        mockSRSState.resetAll.mockClear()
        mockSRSState.setHasHydrated.mockClear()
    })

    function renderSRSHook(props: HookProps) {
        return renderHook((hookProps: HookProps) => useSRSReviewRecording({
            ...hookProps,
            srsContext: { collectionId: 'col' },
        }), {
            initialProps: props,
        })
    }

    it('pauses on a correct answer until an interval is selected', () => {
        const setIsPaused = vi.fn()
        const setTimeLeft = vi.fn()

        const { result } = renderSRSHook({
            status: 'completed',
            timeLeft: 5,
            currentIndex: 0,
            currentChallenge: challenge,
            isCorrect: true,
            setIsPaused,
            setTimeLeft,
            reinsertCurrentChallenge: vi.fn(),
        })

        expect(result.current.showingIntervalPills).toBe(true)
        expect(setIsPaused).toHaveBeenCalledWith(true)

        fireEvent.keyDown(window, { key: '9' })

        expect(result.current.intervalChoice).toBe('2w')
        expect(setIsPaused).toHaveBeenLastCalledWith(false)
        expect(setTimeLeft).toHaveBeenCalledWith(2)
    })

    it('records an incorrect SRS answer and reinserts the card', () => {
        const reinsertCurrentChallenge = vi.fn()

        renderSRSHook({
            status: 'submitted',
            timeLeft: 0,
            currentIndex: 3,
            currentChallenge: challenge,
            isCorrect: false,
            setIsPaused: vi.fn(),
            setTimeLeft: vi.fn(),
            reinsertCurrentChallenge,
        })

        expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'incorrect')
        expect(reinsertCurrentChallenge).toHaveBeenCalledWith(3)
    })

    it('records ASAP as interval 0 and reinserts the card', () => {
        const reinsertCurrentChallenge = vi.fn()

        const { result, rerender } = renderSRSHook({
            status: 'completed',
            timeLeft: 5,
            currentIndex: 0,
            currentChallenge: challenge,
            isCorrect: true,
            setIsPaused: vi.fn(),
            setTimeLeft: vi.fn(),
            reinsertCurrentChallenge,
        })

        act(() => {
            result.current.handleIntervalClick('asap')
        })

        rerender({
            status: 'completed',
            timeLeft: 0,
            currentIndex: 0,
            currentChallenge: challenge,
            isCorrect: true,
            setIsPaused: vi.fn(),
            setTimeLeft: vi.fn(),
            reinsertCurrentChallenge,
        })

        expect(mockRecordReviewWithInterval).toHaveBeenCalledWith('col', '1', 0)
        expect(reinsertCurrentChallenge).toHaveBeenCalledWith(0)
    })

    it('does not record before the timer expires', () => {
        renderSRSHook({
            status: 'completed',
            timeLeft: 1,
            currentIndex: 0,
            currentChallenge: challenge,
            isCorrect: true,
            setIsPaused: vi.fn(),
            setTimeLeft: vi.fn(),
            reinsertCurrentChallenge: vi.fn(),
        })

        expect(mockRecordReview).not.toHaveBeenCalled()
        expect(mockRecordReviewWithInterval).not.toHaveBeenCalled()
    })
})
