import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const idb = vi.hoisted(() => {
    const db = new Map<string, string>()
    return {
        db,
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => {
            db.set(key, value)
            return Promise.resolve()
        }),
        del: vi.fn((key: string) => {
            db.delete(key)
            return Promise.resolve()
        }),
    }
})

// Mock idb-keyval before importing the store so it doesn't hit real IndexedDB
vi.mock('idb-keyval', () => {
    return {
        get: idb.get,
        set: idb.set,
        del: idb.del,
    }
})

import { del, set } from 'idb-keyval'
import { useSRSStore } from '@/store/useSRSStore'

describe('useSRSStore', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-05-02T12:00:00.000Z'))
        idb.db.clear()
        vi.clearAllMocks()
        // Reset the in-memory store state before each test
        useSRSStore.setState({ cards: {}, lastPlayedAt: {}, _hasHydrated: false })
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('recordPlay', () => {
        it('stores a timestamp for the given collection', () => {
            useSRSStore.getState().recordPlay('col1')

            const ts = useSRSStore.getState().lastPlayedAt['col1']
            expect(ts).toBe(new Date('2026-05-02T12:00:00.000Z').getTime())
        })

        it('keeps entries for different collections independently', () => {
            useSRSStore.getState().recordPlay('col1')
            useSRSStore.getState().recordPlay('col2')

            expect(useSRSStore.getState().lastPlayedAt['col1']).toBeDefined()
            expect(useSRSStore.getState().lastPlayedAt['col2']).toBeDefined()
        })

        it('overwrites the timestamp when called again for the same collection', () => {
            useSRSStore.getState().recordPlay('col1')
            const first = useSRSStore.getState().lastPlayedAt['col1']

            vi.setSystemTime(new Date('2026-05-02T12:05:00.000Z'))
            useSRSStore.getState().recordPlay('col1')
            const second = useSRSStore.getState().lastPlayedAt['col1']

            expect(second).toBe(new Date('2026-05-02T12:05:00.000Z').getTime())
            expect(second).toBeGreaterThan(first)
        })
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
            expect(card.interval).toBe(0)
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
            expect(card.interval).toBe(0)
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

    describe('recordReviewWithInterval', () => {
        it('creates a card with the specified interval and nextReviewAt', () => {
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 1)

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card).toBeDefined()
            expect(card.interval).toBe(1)
            expect(card.repetitions).toBe(1)
            expect(card.nextReviewAt).toBe(new Date('2026-05-03T12:00:00.000Z').getTime())
        })

        it('sets nextReviewAt to now for ASAP (0 days)', () => {
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 0)

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.interval).toBe(0)
            expect(card.nextReviewAt).toBe(new Date('2026-05-02T12:00:00.000Z').getTime())
        })

        it('resets repetitions for ASAP (0 days)', () => {
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 1)
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 0)

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.repetitions).toBe(0)
        })

        it('increments repetitions for longer intervals', () => {
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 1)
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 3)

            const card = useSRSStore.getState().cards['col1:ch1']
            expect(card.repetitions).toBe(2)
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

    describe('persistence', () => {
        it('persists cards and play timestamps without runtime hydration state', async () => {
            useSRSStore.getState().recordPlay('col1')
            useSRSStore.getState().recordReviewWithInterval('col1', 'ch1', 3)
            useSRSStore.getState().setHasHydrated(true)

            await vi.waitFor(() => expect(set).toHaveBeenCalledWith('langtype-srs-v1', expect.any(String)))

            const persistedValue = vi.mocked(set).mock.calls.at(-1)?.[1] as string
            expect(JSON.parse(persistedValue)).toEqual({
                state: {
                    cards: useSRSStore.getState().cards,
                    lastPlayedAt: {
                        col1: new Date('2026-05-02T12:00:00.000Z').getTime(),
                    },
                },
                version: 1,
            })
        })

        it('hydrates persisted cards and marks hydration complete', async () => {
            idb.db.set('langtype-srs-v1', JSON.stringify({
                state: {
                    cards: {
                        'col1:ch1': {
                            collectionId: 'col1',
                            challengeId: 'ch1',
                            interval: 3,
                            repetitions: 2,
                            easeFactor: 2.5,
                            nextReviewAt: 1_777_809_600_000,
                            lastReviewedAt: 1_777_550_400_000,
                        },
                    },
                    lastPlayedAt: { col1: 1_777_550_400_000 },
                },
                version: 1,
            }))

            await useSRSStore.persist.rehydrate()

            expect(useSRSStore.getState().cards['col1:ch1']).toMatchObject({
                collectionId: 'col1',
                challengeId: 'ch1',
                interval: 3,
            })
            expect(useSRSStore.getState().lastPlayedAt).toEqual({ col1: 1_777_550_400_000 })
            expect(useSRSStore.getState()._hasHydrated).toBe(true)
        })

        it('removes persisted storage through the store boundary', async () => {
            await useSRSStore.persist.clearStorage()

            expect(del).toHaveBeenCalledWith('langtype-srs-v1')
        })
    })
})
