import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { SRSQueuePanel } from '../SRSQueuePanel'
import type { SRSStore } from '@/store/useSRSStore'
import type { SRSCard } from '@/types/srs'

const NOW = 1_000_000_000_000
const HOUR = 3_600_000
const DAY = 86_400_000

const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, SRSCard>,
}))

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: Pick<SRSStore, 'cards'>) => T) => selector(mockSRSState),
}))

function makeCard(overrides: Partial<SRSCard> = {}): SRSCard {
    return {
        collectionId: 'col',
        challengeId: 'a',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        nextReviewAt: NOW + HOUR / 2,
        lastReviewedAt: NOW - DAY,
        ...overrides,
    }
}

function getRow(label: string): HTMLElement {
    return screen.getByText(label).closest('tr') ?? expect.fail(`Missing row for ${label}`)
}

describe('SRSQueuePanel', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        mockSRSState.cards = {}
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders closed by default and opens from the queue button', () => {
        render(<SRSQueuePanel />)

        expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'View upcoming queue load' }))

        expect(screen.getByText('Upcoming')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Close queue panel' })).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes from the open-state button and from an outside pointer event', () => {
        render(<SRSQueuePanel />)

        fireEvent.click(screen.getByRole('button', { name: 'View upcoming queue load' }))
        fireEvent.click(screen.getByRole('button', { name: 'Close queue panel' }))
        expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'View upcoming queue load' }))
        fireEvent.pointerDown(document.body)
        expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()
    })

    it('shows here and all queue buckets when collection context is provided', () => {
        mockSRSState.cards = {
            'col:a': makeCard({ challengeId: 'a', nextReviewAt: NOW + HOUR / 2 }),
            'col:b': makeCard({ challengeId: 'b', nextReviewAt: NOW + DAY }),
            'other:c': makeCard({ collectionId: 'other', challengeId: 'c', nextReviewAt: NOW + HOUR / 2 }),
        }

        render(
            <SRSQueuePanel
                collectionId="col"
                allChallenges={[
                    { id: 'a', translation: 'A' },
                    { id: 'b', translation: 'B' },
                ]}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'View upcoming queue load' }))

        expect(screen.getByText('here')).toBeInTheDocument()
        expect(screen.getByText('all')).toBeInTheDocument()
        expect(within(getRow('< 1h')).getAllByText('1')).toHaveLength(1)
        expect(within(getRow('< 1h')).getByText('2')).toBeInTheDocument()
        expect(within(getRow('< 1d')).getAllByText('1')).toHaveLength(2)
    })

    it('works without collection context and only shows all-collection counts', () => {
        mockSRSState.cards = {
            'col:a': makeCard({ nextReviewAt: NOW + HOUR / 2 }),
            'other:c': makeCard({ collectionId: 'other', challengeId: 'c', nextReviewAt: NOW + HOUR / 2 }),
        }

        render(<SRSQueuePanel />)

        fireEvent.click(screen.getByRole('button', { name: 'View upcoming queue load' }))

        expect(screen.queryByText('here')).not.toBeInTheDocument()
        expect(screen.queryByText('all')).not.toBeInTheDocument()
        expect(within(getRow('< 1h')).getByText('2')).toBeInTheDocument()
    })
})
