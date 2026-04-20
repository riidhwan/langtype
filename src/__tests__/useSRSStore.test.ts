import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock idb-keyval before importing the store so it doesn't hit real IndexedDB
vi.mock('idb-keyval', () => {
    const db = new Map<string, string>()
    return {
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => { db.set(key, value); return Promise.resolve() }),
        del: vi.fn((key: string) => { db.delete(key); return Promise.resolve() }),
    }
})

import { useSRSStore } from '@/store/useSRSStore'

describe('useSRSStore', () => {
    beforeEach(() => {
        // Reset the in-memory store state before each test
        useSRSStore.setState({ cards: {}, _hasHydrated: false })
    })

    describe('setHasHydrated', () => {
        it('updates _hasHydrated to true', () => {
            useSRSStore.getState().setHasHydrated(true)
            expect(useSRSStore.getState()._hasHydrated).toBe(true)
        })

        it('updates _hasHydrated to false', () => {
            useSRSStore.setState({ _hasHydrated: true })
            useSRSStore.getState().setHasHydrated(false)
            expect(useSRSStore.getState()._hasHydrated).toBe(false)
        })
    })

    describe('recordReview', () => {
        it('creates a new card on first correct review', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card).toBeDefined()
            expect(card.collectionId).toBe('col1')
            expect(card.challengeId).toBe('ch1')
            expect(card.repetitions).toBe(1)
            expect(card.interval).toBe(1)
            expect(card.nextReviewAt).toBeGreaterThan(0)
        })

        it('creates a new card on first incorrect review', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'incorrect')

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card).toBeDefined()
            expect(card.repetitions).toBe(0)
            expect(card.interval).toBe(1)
        })

        it('gives 6-day interval after two consecutive correct answers', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.repetitions).toBe(2)
            expect(card.interval).toBe(6)
        })

        it('resets repetitions and decreases easeFactor on incorrect answer', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            const efBefore = useSRSStore.getState().cards['col1:ch1'].easeFactor

            useSRSStore.getState().recordReview('col1', 'ch1', 'incorrect')

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.repetitions).toBe(0)
            expect(card.interval).toBe(1)
            expect(card.easeFactor).toBeLessThan(efBefore)
        })

        it('does not decrease easeFactor below 1.3', () => {
            // Drive easeFactor down to minimum
            for (let i = 0; i < 20; i++) {
                useSRSStore.getState().recordReview('col1', 'ch1', 'incorrect')
            }
            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.easeFactor).toBeGreaterThanOrEqual(1.3)
        })
    })

    describe('getCard', () => {
        it('returns undefined for a card that has not been reviewed', () => {
            const card = useSRSStore.getState().getCard('col1', 'unknown')
            expect(card).toBeUndefined()
        })

        it('returns the card after it has been reviewed', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')

            const card = useSRSStore.getState().getCard('col1', 'ch1')
            expect(card).toBeDefined()
            expect(card?.challengeId).toBe('ch1')
        })
    })

    describe('resetCollection', () => {
        it('removes cards belonging to the specified collection', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            useSRSStore.getState().recordReview('col1', 'ch2', 'correct')

            useSRSStore.getState().resetCollection('col1')

            const { cards } = useSRSStore.getState()
            expect(cards['col1:ch1']).toBeUndefined()
            expect(cards['col1:ch2']).toBeUndefined()
        })

        it('does not remove cards from other collections', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            useSRSStore.getState().recordReview('col2', 'ch1', 'correct')

            useSRSStore.getState().resetCollection('col1')

            expect(useSRSStore.getState().cards['col2:ch1']).toBeDefined()
        })
    })

    describe('resetAll', () => {
        it('removes all cards across all collections', () => {
            useSRSStore.getState().recordReview('col1', 'ch1', 'correct')
            useSRSStore.getState().recordReview('col2', 'ch2', 'correct')

            useSRSStore.getState().resetAll()

            expect(useSRSStore.getState().cards).toEqual({})
        })
    })
})
