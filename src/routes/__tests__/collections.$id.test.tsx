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

// TypingGame mock exposes onFinished, srsContext.onCardResult and srsContext.isRetry
vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: ({ onQuestionChange, onFinished, srsContext }: any) => (
        <div data-testid="typing-game" data-is-retry={String(srsContext?.isRetry ?? false)}>
            <button onClick={() => onQuestionChange?.('next-id')} data-testid="next-question-btn">
                Next Question
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
})
