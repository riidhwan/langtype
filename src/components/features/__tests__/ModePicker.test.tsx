import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModePicker } from '../ModePicker'
import type { Collection } from '@/types/challenge'

// Shared mutable state — mutated per-test in beforeEach
const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, any>,
    _hasHydrated: true,
    resetCollection: vi.fn(),
}))

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) => selector(mockSRSState),
}))

const mockGetDueChallengeIds = vi.hoisted(() => vi.fn((_colId: string, ids: string[]) => ids))
const mockGetNextReviewTime = vi.hoisted(() => vi.fn(() => null as number | null))

vi.mock('@/lib/srsAlgorithm', () => ({
    getDueChallengeIds: mockGetDueChallengeIds,
    getNextReviewTime: mockGetNextReviewTime,
}))

const collection: Collection = {
    id: 'test-col',
    title: 'Test Collection',
    description: 'A test collection',
    challenges: [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
    ],
}

describe('ModePicker', () => {
    beforeEach(() => {
        mockSRSState.cards = {}
        mockSRSState._hasHydrated = true
        mockSRSState.resetCollection.mockClear()
        // Default: all cards due, no future review
        mockGetDueChallengeIds.mockImplementation((_colId, ids) => ids)
        mockGetNextReviewTime.mockReturnValue(null)
    })

    it('renders collection title and description', () => {
        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText('Test Collection')).toBeInTheDocument()
        expect(screen.getByText('A test collection')).toBeInTheDocument()
    })

    it('shows total challenge count on the Practice All card', () => {
        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText(/2 challenges in random order/)).toBeInTheDocument()
    })

    it('calls onSelectNormal when Practice All is clicked', () => {
        const onSelectNormal = vi.fn()
        render(<ModePicker collection={collection} onSelectNormal={onSelectNormal} onSelectSRS={vi.fn()} />)

        fireEvent.click(screen.getByText('Practice All'))

        expect(onSelectNormal).toHaveBeenCalledOnce()
    })

    it('shows due count when cards are due', () => {
        mockGetDueChallengeIds.mockReturnValue(['1', '2'])

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText('2 cards due for review')).toBeInTheDocument()
    })

    it('uses singular "card" when exactly 1 card is due', () => {
        mockGetDueChallengeIds.mockReturnValue(['1'])

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText('1 card due for review')).toBeInTheDocument()
    })

    it('calls onSelectSRS when Spaced Repetition is clicked and cards are due', () => {
        mockGetDueChallengeIds.mockReturnValue(['1'])
        const onSelectSRS = vi.fn()

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={onSelectSRS} />)

        fireEvent.click(screen.getByText('Spaced Repetition'))

        expect(onSelectSRS).toHaveBeenCalledOnce()
    })

    it('does not call onSelectSRS when Spaced Repetition is clicked but no cards are due', () => {
        mockGetDueChallengeIds.mockReturnValue([])
        const onSelectSRS = vi.fn()

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={onSelectSRS} />)

        fireEvent.click(screen.getByText('Spaced Repetition'))

        expect(onSelectSRS).not.toHaveBeenCalled()
    })

    it('shows next review hours when no cards are due but future review exists', () => {
        mockGetDueChallengeIds.mockReturnValue([])
        mockGetNextReviewTime.mockReturnValue(Date.now() + 3 * 3_600_000)

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText(/Next review in 3 hours/)).toBeInTheDocument()
    })

    it('shows "All caught up" when no due cards and no future review', () => {
        mockGetDueChallengeIds.mockReturnValue([])
        mockGetNextReviewTime.mockReturnValue(null)

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText(/All caught up/)).toBeInTheDocument()
    })

    it('does not show reset button when no SRS progress exists', () => {
        mockSRSState.cards = {}

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.queryByText('Reset SRS progress')).not.toBeInTheDocument()
    })

    it('shows reset button when SRS progress exists for this collection', () => {
        mockSRSState.cards = { 'test-col:1': {} }

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        expect(screen.getByText('Reset SRS progress')).toBeInTheDocument()
    })

    it('shows confirmation UI when Reset SRS progress is clicked', () => {
        mockSRSState.cards = { 'test-col:1': {} }

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        fireEvent.click(screen.getByText('Reset SRS progress'))

        expect(screen.getByText('Reset SRS progress for this collection?')).toBeInTheDocument()
        expect(screen.getByText('Reset')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('hides confirmation and restores reset button when Cancel is clicked', () => {
        mockSRSState.cards = { 'test-col:1': {} }

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        fireEvent.click(screen.getByText('Reset SRS progress'))
        fireEvent.click(screen.getByText('Cancel'))

        expect(screen.queryByText('Reset SRS progress for this collection?')).not.toBeInTheDocument()
        expect(screen.getByText('Reset SRS progress')).toBeInTheDocument()
    })

    it('calls resetCollection with the collection id when Reset is confirmed', () => {
        mockSRSState.cards = { 'test-col:1': {} }

        render(<ModePicker collection={collection} onSelectNormal={vi.fn()} onSelectSRS={vi.fn()} />)

        fireEvent.click(screen.getByText('Reset SRS progress'))
        fireEvent.click(screen.getByText('Reset'))

        expect(mockSRSState.resetCollection).toHaveBeenCalledWith('test-col')
    })
})
