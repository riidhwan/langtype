import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import type { MockInstance } from 'vitest'

const mockNavigate = vi.fn()
let randomSpy: MockInstance
const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, SRSCard>,
    lastPlayedAt: {} as Record<string, number>,
    _hasHydrated: true,
    recordPlay: vi.fn(),
    recordReview: vi.fn(),
    recordReviewWithInterval: vi.fn(),
    resetCollection: vi.fn(),
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

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: typeof mockSRSState) => T) => selector(mockSRSState),
}))

import { CollectionGamePage, Route } from '../collections.$id'

const mockCollection: Collection = {
    id: 'test',
    title: 'Test',
    description: 'Route test collection',
    challenges: [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
    ],
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
        vi.useFakeTimers()
        vi.clearAllMocks()
        randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
        mockSRSState.cards = {}
        mockSRSState._hasHydrated = true
        vi.mocked(Route.useLoaderData).mockReturnValue(mockCollection)
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'normal' })
    })

    afterEach(() => {
        randomSpy.mockRestore()
        vi.useRealTimers()
    })

    it('renders the mode picker when no mode is selected', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: undefined })

        render(<CollectionGamePage />)

        expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /practice all/i })).toBeInTheDocument()
        expect(screen.queryByRole('textbox', { name: 'Translation answer' })).not.toBeInTheDocument()
    })

    it('renders the game when mode=normal', () => {
        render(<CollectionGamePage />)

        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Translation answer' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /practice all/i })).not.toBeInTheDocument()
    })

    it('renders the SRS all-done screen when mode=srs and no cards are due', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })
        mockSRSState.cards = {
            'test:1': reviewedCard('test', '1'),
            'test:2': reviewedCard('test', '2'),
        }

        render(<CollectionGamePage />)

        expect(screen.getByRole('heading', { name: 'All caught up!' })).toBeInTheDocument()
        expect(screen.getByText(/Next cards due in/i)).toBeInTheDocument()
        expect(screen.queryByRole('textbox', { name: 'Translation answer' })).not.toBeInTheDocument()
    })

    it('renders the game when mode=srs and cards are due', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })

        render(<CollectionGamePage />)

        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('1 card remaining')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'All caught up!' })).not.toBeInTheDocument()
    })

    it('navigates when the real game advances to the next question', () => {
        render(<CollectionGamePage />)

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        fireEvent.change(input, { target: { value: 'Hallo' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

        act(() => {
            vi.advanceTimersByTime(5100)
        })

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ replace: true })
        )

        const callArg = mockNavigate.mock.calls.at(-1)?.[0]
        const updatedSearch = callArg.search({ mode: 'normal' })
        expect(updatedSearch).toMatchObject({ questionId: 2, mode: 'normal' })
    })

    it('navigates to picker when the real SRS game finishes', () => {
        vi.mocked(Route.useLoaderData).mockReturnValue({
            ...mockCollection,
            challenges: [{ id: '1', original: 'Hello', translation: 'Hallo' }],
        })
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: undefined, mode: 'srs' })

        render(<CollectionGamePage />)

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        fireEvent.change(input, { target: { value: 'Hallo' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
        fireEvent.click(screen.getByRole('button', { name: '1d' }))

        act(() => {
            vi.advanceTimersByTime(2100)
        })

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ search: expect.any(Function) })
        )
        const callArg = mockNavigate.mock.calls.at(-1)?.[0]
        expect(callArg.search({})).toEqual({})
    })

    it('passes initialQuestionId from URL to TypingGame', () => {
        vi.mocked(Route.useSearch).mockReturnValue({ questionId: '2', mode: 'srs' })

        render(<CollectionGamePage />)

        expect(screen.getByText('World')).toBeInTheDocument()
        expect(screen.queryByText('Hello')).not.toBeInTheDocument()
    })

    it('renders deep-linked AI-imported custom collection challenges in SRS free-input mode', () => {
        const importedCollection: Collection = {
            id: 'custom_moooa5bf_das60i',
            title: 'AI imported',
            freeInput: true,
            challenges: [
                { id: 'ch_mooolutc_843imj', original: 'This is my dog.', translation: '(Das ist )mein( Hund.)' },
                { id: 'ch_mooolutc_843imk', original: 'Where is your (informal) key?', translation: '(Wo ist )dein( Schlüssel?)' },
                { id: 'ch_mooolutc_843iml', original: 'His sister is tall.', translation: 'Seine( Schwester ist groß.)' },
                { id: 'ch_mooolutc_843imm', original: 'Her cat is sleeping.', translation: 'Ihre( Katze schläft.)' },
                { id: 'ch_mooolutc_843imn', original: 'We love our house.', translation: '(Wir lieben )unser( Haus.)' },
                { id: 'ch_mooolutc_843imo', original: 'Is that your (plural/informal) car?', translation: '(Ist das )euer( Auto?)' },
                { id: 'ch_mooolutc_843imp', original: 'They are looking for their books.', translation: '(Sie suchen )ihre( Bücher.)' },
                { id: 'ch_mooolutc_843imq', original: 'What is your (formal) name?', translation: '(Wie ist )Ihr( Name?)' },
                { id: 'ch_mooolutc_843imr', original: 'My parents are here.', translation: 'Meine( Eltern sind hier.)' },
                { id: 'ch_mooolutc_843ims', original: 'The child plays with its toy.', translation: '(Das Kind spielt mit )seinem( Spielzeug.)' },
            ],
        }
        vi.mocked(Route.useLoaderData).mockReturnValue(importedCollection)
        vi.mocked(Route.useSearch).mockReturnValue({
            questionId: 'ch_mooolutc_843imj',
            mode: 'srs',
        })

        render(<CollectionGamePage />)

        expect(screen.getByText('This is my dog.')).toBeInTheDocument()
        expect(screen.getByText('Das ist')).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Translation gap 1' })).toBeInTheDocument()
        expect(screen.getByText('Hund.')).toBeInTheDocument()
    })

    it('passes no initialQuestionId when questionId is absent', () => {
        render(<CollectionGamePage />)

        expect(screen.getByText('Hello')).toBeInTheDocument()
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

        expect(screen.getByText(/Hello|Test/)).toBeInTheDocument()
        expect(screen.queryByText('World')).not.toBeInTheDocument()
        expect(screen.getByText('1 card remaining')).toBeInTheDocument()
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

        expect(screen.getByText('2 cards remaining')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'All caught up!' })).not.toBeInTheDocument()
    })

    it('records collection play when a session mode is active', () => {
        render(<CollectionGamePage />)

        expect(mockSRSState.recordPlay).toHaveBeenCalledWith('test')
    })
})
