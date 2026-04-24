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

vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: ({ onQuestionChange, onFinished, initialQuestionId }: any) => (
        <div
            data-testid="typing-game"
            data-initial-question-id={initialQuestionId ?? ''}
        >
            <button onClick={() => onQuestionChange?.('next-id')} data-testid="next-question-btn">
                Next Question
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

    it('navigates to picker when SRS session finishes', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' } as any)
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
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: '1', mode: 'srs' } as any)
        vi.mocked(getDueChallengeIds).mockReturnValue(['1'])

        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('1')
    })

    it('passes no initialQuestionId when questionId is absent', () => {
        render(<CollectionGamePage />)

        expect(screen.getByTestId('typing-game').dataset.initialQuestionId).toBe('')
    })
})
