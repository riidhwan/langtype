import { describe, it, expect } from 'vitest'
import {
    createNewCard,
    computeReview,
    computeReviewFromInterval,
    isCardDue,
    getDueChallengeIds,
    getNextReviewTime,
    getQueueLoadBuckets,
} from '../srsAlgorithm'
import type { SRSCard } from '@/types/srs'

const NOW = 1_000_000_000_000 // fixed timestamp for deterministic tests
const DAY = 86_400_000
const HOUR = 3_600_000

function makeCard(overrides: Partial<SRSCard> = {}): SRSCard {
    return {
        collectionId: 'col',
        challengeId: '1',
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewAt: 0,
        lastReviewedAt: 0,
        ...overrides,
    }
}

describe('createNewCard', () => {
    it('creates a card with all zero values and default ease factor', () => {
        const card = createNewCard('col', '1')
        expect(card.collectionId).toBe('col')
        expect(card.challengeId).toBe('1')
        expect(card.interval).toBe(0)
        expect(card.repetitions).toBe(0)
        expect(card.easeFactor).toBe(2.5)
        expect(card.nextReviewAt).toBe(0)
        expect(card.lastReviewedAt).toBe(0)
    })
})

describe('computeReview — correct', () => {
    it('sets interval to 1 on first correct answer (rep 0)', () => {
        const result = computeReview(makeCard({ repetitions: 0 }), 'correct', NOW)
        expect(result.interval).toBe(1)
        expect(result.repetitions).toBe(1)
        expect(result.nextReviewAt).toBe(NOW + 1 * DAY)
    })

    it('sets interval to 6 on second correct answer (rep 1)', () => {
        const result = computeReview(makeCard({ repetitions: 1, interval: 1 }), 'correct', NOW)
        expect(result.interval).toBe(6)
        expect(result.repetitions).toBe(2)
        expect(result.nextReviewAt).toBe(NOW + 6 * DAY)
    })

    it('multiplies interval by ease factor on subsequent correct answers', () => {
        const result = computeReview(makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 }), 'correct', NOW)
        expect(result.interval).toBe(Math.round(6 * 2.5)) // 15
        expect(result.repetitions).toBe(3)
    })

    it('increases ease factor by 0.1 on correct', () => {
        const result = computeReview(makeCard({ easeFactor: 2.5 }), 'correct', NOW)
        expect(result.easeFactor).toBeCloseTo(2.6)
    })

    it('records lastReviewedAt', () => {
        const result = computeReview(makeCard(), 'correct', NOW)
        expect(result.lastReviewedAt).toBe(NOW)
    })
})

describe('computeReview — incorrect', () => {
    it('resets repetitions to 0', () => {
        const result = computeReview(makeCard({ repetitions: 5, interval: 30 }), 'incorrect', NOW)
        expect(result.repetitions).toBe(0)
    })

    it('sets interval to 0 and nextReviewAt to now so card is immediately due', () => {
        const result = computeReview(makeCard({ interval: 30 }), 'incorrect', NOW)
        expect(result.interval).toBe(0)
        expect(result.nextReviewAt).toBe(NOW)
    })

    it('decreases ease factor by 0.2', () => {
        const result = computeReview(makeCard({ easeFactor: 2.5 }), 'incorrect', NOW)
        expect(result.easeFactor).toBeCloseTo(2.3)
    })

    it('does not let ease factor drop below 1.3', () => {
        const result = computeReview(makeCard({ easeFactor: 1.3 }), 'incorrect', NOW)
        expect(result.easeFactor).toBeCloseTo(1.3)
    })
})

describe('computeReview — hard', () => {
    it('sets interval to 0.25 days (6h) on first hard answer (rep 0)', () => {
        const result = computeReview(makeCard({ repetitions: 0 }), 'hard', NOW)
        expect(result.interval).toBe(0.25)
        expect(result.nextReviewAt).toBe(NOW + 0.25 * DAY)
    })

    it('sets interval to 3 days on second hard answer (rep 1)', () => {
        const result = computeReview(makeCard({ repetitions: 1, interval: 1 }), 'hard', NOW)
        expect(result.interval).toBe(3)
        expect(result.repetitions).toBe(2)
    })

    it('multiplies interval by ease factor × 0.6 on subsequent hard answers', () => {
        const result = computeReview(makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 }), 'hard', NOW)
        expect(result.interval).toBe(Math.round(6 * 2.5 * 0.6)) // 9
    })

    it('increments repetitions', () => {
        const result = computeReview(makeCard({ repetitions: 0 }), 'hard', NOW)
        expect(result.repetitions).toBe(1)
    })

    it('decreases ease factor by 0.1', () => {
        const result = computeReview(makeCard({ easeFactor: 2.5 }), 'hard', NOW)
        expect(result.easeFactor).toBeCloseTo(2.4)
    })

    it('does not let ease factor drop below 1.3', () => {
        const result = computeReview(makeCard({ easeFactor: 1.3 }), 'hard', NOW)
        expect(result.easeFactor).toBeCloseTo(1.3)
    })

    it('records lastReviewedAt', () => {
        const result = computeReview(makeCard(), 'hard', NOW)
        expect(result.lastReviewedAt).toBe(NOW)
    })
})

describe('computeReviewFromInterval', () => {
    it('ASAP (0 days): resets reps, applies −0.2 EF delta, sets nextReviewAt to now', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 3, easeFactor: 2.5 }), 0, NOW)
        expect(result.interval).toBe(0)
        expect(result.repetitions).toBe(0)
        expect(result.easeFactor).toBeCloseTo(2.3)
        expect(result.nextReviewAt).toBe(NOW)
        expect(result.lastReviewedAt).toBe(NOW)
    })

    it('1h (1/24 days): resets reps, applies −0.15 EF delta', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 2, easeFactor: 2.5 }), 1 / 24, NOW)
        expect(result.repetitions).toBe(0)
        expect(result.easeFactor).toBeCloseTo(2.35)
        expect(result.nextReviewAt).toBeCloseTo(NOW + (1 / 24) * DAY)
    })

    it('6h (0.25 days): increments reps, applies −0.1 EF delta', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 1, easeFactor: 2.5 }), 0.25, NOW)
        expect(result.repetitions).toBe(2)
        expect(result.easeFactor).toBeCloseTo(2.4)
        expect(result.nextReviewAt).toBe(NOW + 0.25 * DAY)
    })

    it('12h (0.5 days): increments reps, applies −0.05 EF delta', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 1, easeFactor: 2.5 }), 0.5, NOW)
        expect(result.repetitions).toBe(2)
        expect(result.easeFactor).toBeCloseTo(2.45)
        expect(result.nextReviewAt).toBe(NOW + 0.5 * DAY)
    })

    it('1d (1 day): increments reps, no EF change', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 1, easeFactor: 2.5 }), 1, NOW)
        expect(result.repetitions).toBe(2)
        expect(result.easeFactor).toBeCloseTo(2.5)
        expect(result.nextReviewAt).toBe(NOW + DAY)
    })

    it('3d (3 days): increments reps, applies +0.1 EF delta', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 1, easeFactor: 2.5 }), 3, NOW)
        expect(result.repetitions).toBe(2)
        expect(result.easeFactor).toBeCloseTo(2.6)
        expect(result.nextReviewAt).toBe(NOW + 3 * DAY)
    })

    it('1w (7 days): increments reps, applies +0.15 EF delta', () => {
        const result = computeReviewFromInterval(makeCard({ repetitions: 1, easeFactor: 2.5 }), 7, NOW)
        expect(result.repetitions).toBe(2)
        expect(result.easeFactor).toBeCloseTo(2.65)
        expect(result.nextReviewAt).toBe(NOW + 7 * DAY)
    })

    it('clamps EF to minimum 1.3 on large negative delta', () => {
        const result = computeReviewFromInterval(makeCard({ easeFactor: 1.3 }), 0, NOW)
        expect(result.easeFactor).toBeCloseTo(1.3)
    })

    it('clamps EF to maximum 4.0 on large positive delta', () => {
        const result = computeReviewFromInterval(makeCard({ easeFactor: 3.95 }), 7, NOW)
        expect(result.easeFactor).toBeCloseTo(4.0)
    })
})

describe('isCardDue', () => {
    it('returns true for a new card (nextReviewAt === 0)', () => {
        expect(isCardDue(makeCard({ nextReviewAt: 0 }), NOW)).toBe(true)
    })

    it('returns true when nextReviewAt is in the past', () => {
        expect(isCardDue(makeCard({ nextReviewAt: NOW - 1 }), NOW)).toBe(true)
    })

    it('returns true when nextReviewAt equals now', () => {
        expect(isCardDue(makeCard({ nextReviewAt: NOW }), NOW)).toBe(true)
    })

    it('returns false when nextReviewAt is in the future', () => {
        expect(isCardDue(makeCard({ nextReviewAt: NOW + 1 }), NOW)).toBe(false)
    })
})

describe('getDueChallengeIds', () => {
    it('returns all ids when no cards exist (all new)', () => {
        const result = getDueChallengeIds('col', ['1', '2', '3'], {}, NOW)
        expect(result).toEqual(['1', '2', '3'])
    })

    it('includes cards with nextReviewAt in the past', () => {
        const cards = {
            'col:1': makeCard({ collectionId: 'col', challengeId: '1', nextReviewAt: NOW - DAY }),
        }
        const result = getDueChallengeIds('col', ['1', '2'], cards, NOW)
        expect(result).toContain('1')
        expect(result).toContain('2') // no card = new = due
    })

    it('excludes cards with nextReviewAt in the future', () => {
        const cards = {
            'col:1': makeCard({ collectionId: 'col', challengeId: '1', nextReviewAt: NOW + DAY }),
        }
        const result = getDueChallengeIds('col', ['1', '2'], cards, NOW)
        expect(result).not.toContain('1')
        expect(result).toContain('2')
    })
})

describe('getNextReviewTime', () => {
    it('returns null when all cards are due or missing', () => {
        const cards = {
            'col:1': makeCard({ collectionId: 'col', challengeId: '1', nextReviewAt: NOW - DAY }),
        }
        expect(getNextReviewTime('col', ['1', '2'], cards, NOW)).toBeNull()
    })

    it('returns the earliest future nextReviewAt', () => {
        const cards = {
            'col:1': makeCard({ collectionId: 'col', challengeId: '1', nextReviewAt: NOW + 2 * DAY }),
            'col:2': makeCard({ collectionId: 'col', challengeId: '2', nextReviewAt: NOW + 1 * DAY }),
        }
        expect(getNextReviewTime('col', ['1', '2'], cards, NOW)).toBe(NOW + 1 * DAY)
    })

    it('returns null when no challenges are provided', () => {
        expect(getNextReviewTime('col', [], {}, NOW)).toBeNull()
    })
})

describe('getQueueLoadBuckets', () => {
    it('returns 8 buckets with correct labels', () => {
        const result = getQueueLoadBuckets('col', [], {}, NOW)
        expect(result).toHaveLength(8)
        expect(result.map(b => b.label)).toEqual(
            ['< 1h', '< 3h', '< 6h', '< 12h', '< 1d', '< 3d', '< 1w', '< 2w']
        )
    })

    it('returns all zeros when no cards exist', () => {
        const result = getQueueLoadBuckets('col', ['a', 'b'], {}, NOW)
        expect(result.every(b => b.count === 0)).toBe(true)
    })

    it('excludes new cards (lastReviewedAt === 0)', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: 0, nextReviewAt: NOW + HOUR / 2 }) }
        expect(getQueueLoadBuckets('col', ['a'], cards, NOW).every(b => b.count === 0)).toBe(true)
    })

    it('excludes currently due/overdue cards (nextReviewAt <= now)', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW - 1 }) }
        expect(getQueueLoadBuckets('col', ['a'], cards, NOW).every(b => b.count === 0)).toBe(true)
    })

    it('places a card in the < 1h bucket', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + HOUR / 2 }) }
        const result = getQueueLoadBuckets('col', ['a'], cards, NOW)
        expect(result[0].count).toBe(1)
        expect(result.slice(1).every(b => b.count === 0)).toBe(true)
    })

    it('places a card at exactly the 1h upper boundary in < 1h', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + HOUR }) }
        expect(getQueueLoadBuckets('col', ['a'], cards, NOW)[0].count).toBe(1)
    })

    it('places a card 1ms past 1h in < 3h', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + HOUR + 1 }) }
        const result = getQueueLoadBuckets('col', ['a'], cards, NOW)
        expect(result[0].count).toBe(0)
        expect(result[1].count).toBe(1)
    })

    it('ignores cards beyond 2w', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + 15 * DAY }) }
        expect(getQueueLoadBuckets('col', ['a'], cards, NOW).every(b => b.count === 0)).toBe(true)
    })

    it('counts a card exactly at the 2w boundary in < 2w', () => {
        const cards = { 'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + 14 * DAY }) }
        expect(getQueueLoadBuckets('col', ['a'], cards, NOW)[7].count).toBe(1)
    })

    it('distributes multiple cards across multiple buckets', () => {
        const cards = {
            'col:a': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + HOUR / 2 }),  // < 1h
            'col:b': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + HOUR / 2 }),  // < 1h
            'col:c': makeCard({ lastReviewedAt: NOW - DAY, nextReviewAt: NOW + DAY }),        // < 1d
        }
        const result = getQueueLoadBuckets('col', ['a', 'b', 'c'], cards, NOW)
        expect(result[0].count).toBe(2) // < 1h
        expect(result[4].count).toBe(1) // < 1d
    })
})
