import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SRSAllDoneScreen } from '../SRSAllDoneScreen'
import type { Challenge } from '@/types/challenge'

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) => selector({ cards: {} }),
}))

const mockGetNextReviewTime = vi.hoisted(() => vi.fn(() => null as number | null))
vi.mock('@/lib/srsAlgorithm', () => ({
    getNextReviewTime: mockGetNextReviewTime,
}))

const challenges: Challenge[] = [
    { id: '1', original: 'Hello', translation: 'Hallo' },
    { id: '2', original: 'World', translation: 'Welt' },
]

describe('SRSAllDoneScreen', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetNextReviewTime.mockReturnValue(null)
    })

    it('renders "All caught up!" heading', () => {
        render(<SRSAllDoneScreen collectionId="test" challenges={challenges} onBack={vi.fn()} />)
        expect(screen.getByText('All caught up!')).toBeInTheDocument()
    })

    it('shows hours until next review when future cards exist', () => {
        mockGetNextReviewTime.mockReturnValue(Date.now() + 3 * 3_600_000)

        render(<SRSAllDoneScreen collectionId="test" challenges={challenges} onBack={vi.fn()} />)

        expect(screen.getByText(/Next cards due in 3 hours/)).toBeInTheDocument()
    })

    it('uses singular "hour" when exactly 1 hour away', () => {
        mockGetNextReviewTime.mockReturnValue(Date.now() + 3_600_000)

        render(<SRSAllDoneScreen collectionId="test" challenges={challenges} onBack={vi.fn()} />)

        expect(screen.getByText(/Next cards due in 1 hour\./)).toBeInTheDocument()
    })

    it('shows fallback text when no future review is scheduled', () => {
        mockGetNextReviewTime.mockReturnValue(null)

        render(<SRSAllDoneScreen collectionId="test" challenges={challenges} onBack={vi.fn()} />)

        expect(screen.getByText(/check back tomorrow/)).toBeInTheDocument()
    })

    it('calls onBack when the back button is clicked', () => {
        const onBack = vi.fn()
        render(<SRSAllDoneScreen collectionId="test" challenges={challenges} onBack={onBack} />)

        screen.getByText('Back to collection').click()

        expect(onBack).toHaveBeenCalledOnce()
    })
})
