import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSessionChallenges } from '../useSessionChallenges'
import type { Challenge } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'

type SessionMode = 'normal' | 'srs' | undefined

const challenges: Challenge[] = [
    { id: '1', translation: 'one' },
    { id: '2', translation: 'two' },
    { id: '3', translation: 'three' },
]

function reviewedCard(collectionId: string, challengeId: string): SRSCard {
    return {
        collectionId,
        challengeId,
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        nextReviewAt: Date.now() + 86_400_000,
        lastReviewedAt: Date.now(),
    }
}

describe('useSessionChallenges', () => {
    it('snapshots due SRS challenges when the session starts', () => {
        const { result } = renderHook(() =>
            useSessionChallenges({
                collectionId: 'test',
                mode: 'srs',
                allChallenges: challenges,
                cards: { 'test:2': reviewedCard('test', '2') },
            })
        )

        expect(result.current.map((challenge) => challenge.id).sort()).toEqual(['1', '3'])
    })

    it('does not replace the active session when cards change mid-session', () => {
        const { result, rerender } = renderHook(
            ({ cards }) =>
                useSessionChallenges({
                    collectionId: 'test',
                    mode: 'srs',
                    allChallenges: challenges,
                    cards,
                }),
            {
                initialProps: {
                    cards: {},
                },
            }
        )

        expect(result.current).toHaveLength(3)

        rerender({
            cards: {
                'test:1': reviewedCard('test', '1'),
                'test:2': reviewedCard('test', '2'),
                'test:3': reviewedCard('test', '3'),
            },
        })

        expect(result.current).toHaveLength(3)
    })

    it('starts a fresh snapshot when the mode changes', () => {
        const { result, rerender } = renderHook(
            ({ mode }: { mode: SessionMode }) =>
                useSessionChallenges({
                    collectionId: 'test',
                    mode,
                    allChallenges: challenges,
                    cards: {
                        'test:2': reviewedCard('test', '2'),
                    },
                }),
            {
                initialProps: {
                    mode: 'normal' as SessionMode,
                },
            }
        )

        expect(result.current).toHaveLength(3)

        rerender({ mode: 'srs' })

        expect(result.current.map((challenge) => challenge.id).sort()).toEqual(['1', '3'])
    })
})
