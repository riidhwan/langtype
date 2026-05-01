import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import type { Challenge, Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'

const mockNavigate = vi.fn()
const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, SRSCard>,
    lastPlayedAt: {} as Record<string, number>,
    _hasHydrated: false,
    recordPlay: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    const mockUseLoaderData = vi.fn()
    return {
        ...actual,
        Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
            <a href={to} className={className}>{children}</a>
        ),
        createFileRoute: () => () => ({
            useLoaderData: mockUseLoaderData,
            useSearch: vi.fn(() => ({ questionId: undefined, mode: 'normal' })),
        }),
        _mockUseLoaderData: mockUseLoaderData,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: ({
        challenges,
        onQuestionChange,
        onFinished,
        initialQuestionId,
    }: {
        challenges: Challenge[]
        onQuestionChange?: (questionId: string) => void
        onFinished?: () => void
        initialQuestionId?: string
    }) => (
        <div
            data-testid="typing-game"
            data-initial-question-id={initialQuestionId ?? ''}
            data-challenge-ids={challenges.map((challenge) => challenge.id).join(',')}
        >
            <button onClick={() => onQuestionChange?.('next-id')} data-testid="next-question-btn">
                Next Question
            </button>
            <button onClick={() => onFinished?.()} data-testid="finish-btn">
                Finish
            </button>
        </div>
    ),
}))

vi.mock('@/components/features/ModePicker', () => ({
    ModePicker: () => <div data-testid="mode-picker" />,
}))

vi.mock('@/components/features/SRSAllDoneScreen', () => ({
    SRSAllDoneScreen: () => <div data-testid="srs-all-done" />,
}))

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: typeof mockSRSState) => T) => selector(mockSRSState),
}))

vi.mock('@/lib/srsAlgorithm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/srsAlgorithm')>()
    return {
        ...actual,
        getDueChallengeIds: vi.fn((...args: Parameters<typeof actual.getDueChallengeIds>) =>
            actual.getDueChallengeIds(...args)
        ),
    }
})

import { getDueChallengeIds } from '@/lib/srsAlgorithm'
import { CollectionGamePage, Route } from '../collections.$id'

const mockCollection: Collection = {
    id: 'test',
    title: 'Test',
    challenges: [{ id: '1', original: 'a', translation: 'b' }],
}

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

describe('CollectionGamePage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSRSState.cards = {}
        vi.mocked(getDueChallengeIds).mockImplementation((collectionId, challengeIds, cards) =>
            challengeIds.filter((id) => {
                const card = cards[`${collectionId}:${id}`]
                return !card || card.nextReviewAt === 0 || card.nextReviewAt <= Date.now()
            })
        )
        vi.mocked(Route.useLoaderData).mockReturnValue(mockCollection)
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'normal' })
    })

    it('renders the mode picker when no mode is selected', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: undefined })

        render(<CollectionGamePage />)

        expect(screen.getByTestId('mode-picker')).toBeInTheDocument()
        expect(screen.queryByTestId('typing-game')).not.toBeInTheDocument()
    })

    it('renders the game when mode=normal', () => {
        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game')).toBeInTheDocument()
        expect(screen.queryByTestId('mode-picker')).not.toBeInTheDocument()
    })

    it('renders the SRS all-done screen when mode=srs and no cards are due', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })
        vi.mocked(getDueChallengeIds).mockReturnValue([])

        render(<CollectionGamePage />)

        expect(screen.getByTestId('srs-all-done')).toBeInTheDocument()
        expect(screen.queryByTestId('typing-game')).not.toBeInTheDocument()
    })

    it('renders the game when mode=srs and cards are due', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })
        vi.mocked(getDueChallengeIds).mockReturnValue(['1'])

        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game')).toBeInTheDocument()
        expect(screen.queryByTestId('srs-all-done')).not.toBeInTheDocument()
    })

    it('navigates when game triggers question change', () => {
        render(<CollectionGamePage />)

        screen.getByTestId('next-question-btn').click()

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ replace: true })
        )

        const callArg = mockNavigate.mock.calls[0][0]
        const updatedSearch = callArg.search({ mode: 'normal' })
        expect(updatedSearch).toMatchObject({ questionId: 'next-id', mode: 'normal' })
    })

    it('navigates to picker when SRS session finishes', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })
        vi.mocked(getDueChallengeIds).mockReturnValue(['1'])

        render(<CollectionGamePage />)

        fireEvent.click(screen.getByTestId('finish-btn'))

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ search: expect.any(Function) })
        )
        const callArg = mockNavigate.mock.calls[0][0]
        expect(callArg.search({})).toEqual({})
    })

    it('passes initialQuestionId from URL to TypingGame', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: '1', mode: 'srs' })
        vi.mocked(getDueChallengeIds).mockReturnValue(['1'])

        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('1')
    })

    it('passes no initialQuestionId when questionId is absent', () => {
        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('')
    })

    it('snapshots due SRS challenges when the session starts', () => {
        vi.mocked(Route.useLoaderData).mockReturnValue({
            ...mockCollection,
            challenges: [
                { id: '1', translation: 'one' },
                { id: '2', translation: 'two' },
                { id: '3', translation: 'three' },
            ],
        })
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })
        mockSRSState.cards = { 'test:2': reviewedCard('test', '2') }

        render(<CollectionGamePage />)

        const challengeIds = screen.getByTestId('typing-game').dataset.challengeIds?.split(',').sort()
        expect(challengeIds).toEqual(['1', '3'])
    })

    it('keeps the active SRS challenge snapshot when cards change mid-session', () => {
        vi.mocked(Route.useLoaderData).mockReturnValue({
            ...mockCollection,
            challenges: [
                { id: '1', translation: 'one' },
                { id: '2', translation: 'two' },
                { id: '3', translation: 'three' },
            ],
        })
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })

        const { rerender } = render(<CollectionGamePage />)

        mockSRSState.cards = {
            'test:1': reviewedCard('test', '1'),
            'test:2': reviewedCard('test', '2'),
            'test:3': reviewedCard('test', '3'),
        }
        rerender(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game').dataset.challengeIds?.split(',')).toHaveLength(3)
        expect(screen.queryByTestId('srs-all-done')).not.toBeInTheDocument()
    })

    it('records collection play when a session mode is active', () => {
        render(<CollectionGamePage />)

        expect(mockSRSState.recordPlay).toHaveBeenCalledWith('test')
    })
})
