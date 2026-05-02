import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SRSProgressView, getCardStatus, formatTimeUntil } from '../SRSProgressView'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import type { SRSStore } from '@/store/useSRSStore'

const NOW = 1_000_000_000_000
const DAY = 86_400_000
const HOUR = 3_600_000

const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, SRSCard>,
    _hasHydrated: true,
}))

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: Pick<SRSStore, 'cards' | '_hasHydrated'>) => T) => selector(mockSRSState),
}))

vi.mock('@/lib/srsAlgorithm', async (orig) => {
    const actual = await orig<typeof import('@/lib/srsAlgorithm')>()
    return { ...actual, isCardDue: vi.fn(actual.isCardDue) }
})

const collection: Collection = {
    id: 'col',
    title: 'Test Collection',
    description: 'A collection',
    challenges: [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
        { id: '3', original: 'Apple', translation: 'Apfel' },
    ],
}

function makeCard(overrides: Partial<SRSCard> = {}): SRSCard {
    return {
        collectionId: 'col',
        challengeId: '1',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        nextReviewAt: NOW - 1,
        lastReviewedAt: NOW - DAY,
        ...overrides,
    }
}

describe('getCardStatus', () => {
    it('returns new when no card exists', () => {
        expect(getCardStatus({ id: '1', original: 'Hello', translation: 'Hallo' }, 'col', {}, NOW)).toEqual({ type: 'new' })
    })

    it('returns new when card has never been reviewed (lastReviewedAt === 0)', () => {
        const cards = { 'col:1': makeCard({ lastReviewedAt: 0 }) }
        expect(getCardStatus({ id: '1', original: 'Hello', translation: 'Hallo' }, 'col', cards, NOW)).toEqual({ type: 'new' })
    })

    it('returns due when card is past due', () => {
        const cards = { 'col:1': makeCard({ nextReviewAt: NOW - 1, lastReviewedAt: NOW - DAY }) }
        const result = getCardStatus({ id: '1', original: 'Hello', translation: 'Hallo' }, 'col', cards, NOW)
        expect(result.type).toBe('due')
    })

    it('returns upcoming with msUntil when card is in the future', () => {
        const cards = { 'col:1': makeCard({ nextReviewAt: NOW + 2 * HOUR, lastReviewedAt: NOW - DAY }) }
        const result = getCardStatus({ id: '1', original: 'Hello', translation: 'Hallo' }, 'col', cards, NOW)
        expect(result.type).toBe('upcoming')
        if (result.type === 'upcoming') {
            expect(result.msUntil).toBe(2 * HOUR)
        }
    })
})

describe('formatTimeUntil', () => {
    it('formats < 1 hour as "in <1h"', () => {
        expect(formatTimeUntil(30 * 60 * 1000)).toBe('in <1h')
    })

    it('formats hours', () => {
        expect(formatTimeUntil(2 * HOUR)).toBe('in 2h')
        expect(formatTimeUntil(2.5 * HOUR)).toBe('in 3h')
    })

    it('formats days', () => {
        expect(formatTimeUntil(1 * DAY)).toBe('in 1d')
        expect(formatTimeUntil(3.2 * DAY)).toBe('in 4d')
    })
})

describe('SRSProgressView', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        mockSRSState.cards = {}
        mockSRSState._hasHydrated = true
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('shows collection title', () => {
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('Test Collection')).toBeInTheDocument()
    })

    it('shows loading state when not hydrated', () => {
        mockSRSState._hasHydrated = false
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows empty state when collection has no challenges', () => {
        const empty: Collection = { id: 'empty', title: 'Empty', challenges: [] }
        render(<SRSProgressView collection={empty} onBack={vi.fn()} />)
        expect(screen.getByText('No cards in this collection.')).toBeInTheDocument()
    })

    it('shows all challenges as New when no cards have been reviewed', () => {
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('New (3)')).toBeInTheDocument()
        expect(screen.getAllByText('New').filter(el => el.tagName !== 'H2')).toHaveLength(3)
    })

    it('does not render Due section when no cards are due', () => {
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.queryByText(/^Due \(/)).not.toBeInTheDocument()
    })

    it('does not render Upcoming section when no cards are upcoming', () => {
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.queryByText(/^Upcoming \(/)).not.toBeInTheDocument()
    })

    it('shows due cards in the Due section', () => {
        mockSRSState.cards = {
            'col:1': makeCard({ challengeId: '1', nextReviewAt: NOW - 1, lastReviewedAt: NOW - DAY }),
        }
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('Due (1)')).toBeInTheDocument()
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('shows upcoming cards with formatted time', () => {
        mockSRSState.cards = {
            'col:2': makeCard({ challengeId: '2', nextReviewAt: NOW + 2 * HOUR, lastReviewedAt: NOW - DAY }),
        }
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('Upcoming (1)')).toBeInTheDocument()
        expect(screen.getByText('World')).toBeInTheDocument()
        expect(screen.getByText('in 2h')).toBeInTheDocument()
    })

    it('sorts upcoming cards by time ascending', () => {
        mockSRSState.cards = {
            'col:1': makeCard({ challengeId: '1', nextReviewAt: NOW + 3 * DAY, lastReviewedAt: NOW - DAY }),
            'col:2': makeCard({ challengeId: '2', nextReviewAt: NOW + 1 * HOUR, lastReviewedAt: NOW - DAY }),
        }
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        const items = screen.getAllByRole('listitem')
        const texts = items.map(el => el.textContent)
        const worldIdx = texts.findIndex(t => t?.includes('World'))
        const helloIdx = texts.findIndex(t => t?.includes('Hello'))
        expect(worldIdx).toBeLessThan(helloIdx)
    })

    it('shows correct summary counts', () => {
        mockSRSState.cards = {
            'col:1': makeCard({ challengeId: '1', nextReviewAt: NOW - 1, lastReviewedAt: NOW - DAY }),
            'col:2': makeCard({ challengeId: '2', nextReviewAt: NOW + 2 * HOUR, lastReviewedAt: NOW - DAY }),
        }
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        expect(screen.getByText('1 due')).toBeInTheDocument()
        expect(screen.getByText('1 new')).toBeInTheDocument()
        expect(screen.getByText('1 upcoming')).toBeInTheDocument()
    })

    it('does not show due count in summary when there are no due cards', () => {
        render(<SRSProgressView collection={collection} onBack={vi.fn()} />)
        // eslint-disable-next-line sonarjs/slow-regex
        expect(screen.queryByText(/\d+ due/)).not.toBeInTheDocument()
    })
})
