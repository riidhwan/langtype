import { describe, it, expect } from 'vitest'
import {
    createNewCard,
    computeReview,
    isCardDue,
    getDueChallengeIds,
    getNextReviewTime,
} from '../srsAlgorithm'
import type { SRSCard } from '@/types/srs'

const NOW = 1_000_000_000_000 // fixed timestamp for deterministic tests
const DAY = 86_400_000

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

    it('resets interval to 1 day', () => {
        const result = computeReview(makeCard({ interval: 30 }), 'incorrect', NOW)
        expect(result.interval).toBe(1)
        expect(result.nextReviewAt).toBe(NOW + 1 * DAY)
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
