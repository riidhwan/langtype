import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    const mockUseLoaderData = vi.fn()
    return {
        ...actual,
        Link: (props: any) => <a href={props.to} {...props}>{props.children}</a>,
        createFileRoute: () => () => ({
            useLoaderData: mockUseLoaderData,
            useSearch: vi.fn(() => ({ questionId: undefined, mode: 'normal' }))
        }),
        _mockUseLoaderData: mockUseLoaderData,
        useNavigate: () => mockNavigate
    }
})

// TypingGame mock exposes onFinished, srsContext.onCardResult, srsContext.isRetry,
// and srsContext.cardsCompleted so tests can assert on counter state.
vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: ({ onQuestionChange, onFinished, srsContext, initialQuestionId }: any) => (
        <div
            data-testid="typing-game"
            data-is-retry={String(srsContext?.isRetry ?? false)}
            data-cards-completed={String(srsContext?.cardsCompleted ?? 0)}
            data-initial-question-id={initialQuestionId ?? ''}
        >
            <button onClick={() => onQuestionChange?.('next-id')} data-testid="next-question-btn">
                Next Question
            </button>
            <button
                onClick={() => srsContext?.onCardResult?.('1', true)}
                data-testid="record-pass-btn"
            >
                Record Pass
            </button>
            <button
                onClick={() => srsContext?.onCardResult?.('1', false)}
                data-testid="record-miss-btn"
            >
                Record Miss
            </button>
            <button
                onClick={() => {
                    srsContext?.onCardResult?.('1', false)
                    onFinished?.()
                }}
                data-testid="miss-and-finish-btn"
            >
                Miss and Finish
            </button>
            <button onClick={() => onFinished?.()} data-testid="finish-btn">
                Finish
            </button>
        </div>
    )
}))

vi.mock('@/components/features/ModePicker', () => ({
    ModePicker: () => <div data-testid="mode-picker" />
}))

vi.mock('@/components/features/SRSAllDoneScreen', () => ({
    SRSAllDoneScreen: () => <div data-testid="srs-all-done" />
}))

vi.mock('@/store/useSRSStore', () => {
    const mockState = { cards: {}, lastPlayedAt: {}, _hasHydrated: false, recordPlay: vi.fn() }
    return {
        useSRSStore: (selector?: (s: any) => any) =>
            selector ? selector(mockState) : mockState,
    }
})

// Wrap getDueChallengeIds in a vi.fn so it can be overridden per-test
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

const mockCollection = {
    id: 'test',
    title: 'Test',
    challenges: [{ id: '1', original: 'a', translation: 'b' }]
}

describe('CollectionGamePage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(Route.useLoaderData).mockReturnValue(mockCollection as any)
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'normal' } as any)
    })

    it('renders the mode picker when no mode is selected', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: undefined } as any)

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
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
        vi.mocked(getDueChallengeIds).mockReturnValue([])

        render(<CollectionGamePage />)

        expect(screen.getByTestId('srs-all-done')).toBeInTheDocument()
        expect(screen.queryByTestId('typing-game')).not.toBeInTheDocument()
    })

    it('renders the game when mode=srs and cards are due', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
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

    describe('SRS retry logic', () => {
        beforeEach(() => {
            vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
            vi.mocked(getDueChallengeIds).mockReturnValue(['1'])
        })

        it('starts in normal SRS phase (isRetry=false)', () => {
            render(<CollectionGamePage />)

            expect(screen.getByTestId('typing-game').dataset.isRetry).toBe('false')
        })

        it('transitions to retry phase when a card is missed and the session finishes', () => {
            render(<CollectionGamePage />)

            fireEvent.click(screen.getByTestId('miss-and-finish-btn'))

            expect(screen.getByTestId('typing-game').dataset.isRetry).toBe('true')
        })

        it('navigates to picker when the session finishes with no missed cards', () => {
            render(<CollectionGamePage />)

            fireEvent.click(screen.getByTestId('finish-btn'))

            expect(mockNavigate).toHaveBeenCalledWith(
                expect.objectContaining({ search: expect.any(Function) })
            )
            const callArg = mockNavigate.mock.calls[0][0]
            expect(callArg.search({})).toEqual({})
        })
    })

    describe('SRS completedCount / cards remaining', () => {
        beforeEach(() => {
            vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
            vi.mocked(getDueChallengeIds).mockReturnValue(['1'])
        })

        it('passes cardsCompleted=0 at the start of a session', () => {
            render(<CollectionGamePage />)

            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('0')
        })

        it('increments cardsCompleted each time onCardResult is called', () => {
            render(<CollectionGamePage />)

            fireEvent.click(screen.getByTestId('record-pass-btn'))
            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('1')

            fireEvent.click(screen.getByTestId('record-pass-btn'))
            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('2')
        })

        it('resets cardsCompleted to 0 at the start of a retry phase', () => {
            render(<CollectionGamePage />)

            fireEvent.click(screen.getByTestId('record-pass-btn'))
            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('1')

            // Finish with a missed card → triggers retry
            fireEvent.click(screen.getByTestId('miss-and-finish-btn'))

            expect(screen.getByTestId('typing-game').dataset.isRetry).toBe('true')
            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('0')
        })

        it('resets cardsCompleted to 0 when mode changes to picker and a new session is started', () => {
            const { rerender } = render(<CollectionGamePage />)

            // Complete some cards mid-session
            fireEvent.click(screen.getByTestId('record-pass-btn'))
            fireEvent.click(screen.getByTestId('record-pass-btn'))
            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('2')

            // Navigate back to picker
            vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: undefined } as any)
            rerender(<CollectionGamePage />)

            // Start a new SRS session
            vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
            rerender(<CollectionGamePage />)

            expect(screen.getByTestId('typing-game').dataset.cardsCompleted).toBe('0')
        })

        it('pendingMissedIds is populated before handleFinished reads it (ordering guarantee)', () => {
            // onCardResult must run before onFinished so handleFinished sees the missed IDs
            render(<CollectionGamePage />)

            // miss-and-finish-btn simulates the real TypingGame ordering:
            // onCardResult fires first, then onFinished.
            fireEvent.click(screen.getByTestId('miss-and-finish-btn'))

            // If ordering was wrong, handleFinished would see no missed IDs and go to the picker.
            // Correct ordering means retry phase is triggered instead (typing-game still visible).
            expect(screen.getByTestId('typing-game').dataset.isRetry).toBe('true')
            expect(screen.queryByTestId('mode-picker')).not.toBeInTheDocument()
        })
    })

    describe('retry phase initialQuestionId fix', () => {
        beforeEach(() => {
            vi.mocked(Route.useSearch).mockReturnValue({ questionId: '1', mode: 'srs' } as any)
            vi.mocked(getDueChallengeIds).mockReturnValue(['1'])
        })

        it('passes initialQuestionId from URL in the normal SRS phase', () => {
            render(<CollectionGamePage />)

            expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('1')
        })

        it('does not pass initialQuestionId to TypingGame in the retry phase', () => {
            // Bug: after a miss, retry phase starts. The stale questionId in the URL (pointing
            // to the last card of the previous phase) could land at a non-zero index in the
            // shuffled retry list, silently skipping earlier cards and causing the session to
            // end with those cards still due.
            render(<CollectionGamePage />)

            expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('1')

            fireEvent.click(screen.getByTestId('miss-and-finish-btn'))

            expect(screen.getByTestId('typing-game').dataset.isRetry).toBe('true')
            expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('')
        })

        it('clears questionId from the URL when retry starts', () => {
            render(<CollectionGamePage />)

            fireEvent.click(screen.getByTestId('miss-and-finish-btn'))

            expect(mockNavigate).toHaveBeenCalledWith(
                expect.objectContaining({ replace: true })
            )
            const callArg = mockNavigate.mock.calls[0][0]
            const updatedSearch = callArg.search({ mode: 'srs', questionId: '1' })
            expect(updatedSearch).toEqual({ mode: 'srs' })
        })
    })
})
