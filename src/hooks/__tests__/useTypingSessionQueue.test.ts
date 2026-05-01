import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTypingSessionQueue } from '../useTypingSessionQueue'
import type { Challenge } from '@/types/challenge'

describe('useTypingSessionQueue', () => {
    const challenges: Challenge[] = [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
    ]

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('initializes translations from the session queue', () => {
        const { result } = renderHook(() => useTypingSessionQueue(challenges))

        expect(result.current.sessionQueue.map((challenge) => challenge.id)).toEqual(['1', '2'])
        expect(result.current.translations).toEqual(['Hallo', 'Welt'])
    })

    it('reinserts the current challenge into the queue', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)

        const { result } = renderHook(() => useTypingSessionQueue(challenges))

        act(() => {
            result.current.reinsertCurrentChallenge(0)
        })

        expect(result.current.sessionQueue.map((challenge) => challenge.id)).toEqual(['1', '2', '1'])
        expect(result.current.translations).toEqual(['Hallo', 'Welt', 'Hallo'])
    })

    it('resets the queue when a new challenge list arrives', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)

        const nextChallenges: Challenge[] = [
            { id: '3', original: 'Again', translation: 'Nochmals' },
        ]

        const { result, rerender } = renderHook(
            ({ items }) => useTypingSessionQueue(items),
            { initialProps: { items: challenges } },
        )

        act(() => {
            result.current.reinsertCurrentChallenge(0)
        })
        expect(result.current.sessionQueue).toHaveLength(3)

        rerender({ items: nextChallenges })

        expect(result.current.sessionQueue.map((challenge) => challenge.id)).toEqual(['3'])
        expect(result.current.translations).toEqual(['Nochmals'])
    })
})
