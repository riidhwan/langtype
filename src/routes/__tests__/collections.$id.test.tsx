import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import type { Collection } from '@/types/challenge'
import type { SRSCard } from '@/types/srs'
import type { MockInstance } from 'vitest'
import type { CustomCollection } from '@/store/useCustomCollectionsStore'
import type { CollectionSearchState } from '@/components/features/CollectionGamePage'

const mockNavigate = vi.fn()
const mockStartNormal = vi.fn()
const mockStartSRS = vi.fn()
const mockGoToProgress = vi.fn()
const mockQuestionChange = vi.fn()
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
const mockCustomCollectionsState = vi.hoisted(() => ({
    collections: {} as Record<string, CustomCollection>,
    _hasHydrated: true,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
            <a href={to} className={className}>{children}</a>
        ),
        useNavigate: () => mockNavigate,
    }
})

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: typeof mockSRSState) => T) => selector(mockSRSState),
}))

vi.mock('@/store/useCustomCollectionsStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/store/useCustomCollectionsStore')>()
    return {
        ...actual,
        useCustomCollectionsStore: <T,>(selector: (state: typeof mockCustomCollectionsState) => T) => (
            selector(mockCustomCollectionsState)
        ),
    }
})

import { CollectionGamePage } from '@/components/features/CollectionGamePage'

const mockCollection: Collection = {
    id: 'test',
    title: 'Test',
    description: 'Route test collection',
    challenges: [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
    ],
}

const bundledLoaderData = (collection: Collection) => ({
    kind: 'bundled' as const,
    collection,
})

const customLoaderData = (id: string) => ({
    kind: 'custom' as const,
    id,
})

function renderPage({
    loaderData = bundledLoaderData(mockCollection),
    search = { questionId: undefined, mode: 'normal' as const },
}: {
    loaderData?: ReturnType<typeof bundledLoaderData> | ReturnType<typeof customLoaderData>
    search?: CollectionSearchState
} = {}) {
    return render(
        <CollectionGamePage
            loaderData={loaderData}
            search={search}
            onGoToPicker={mockNavigate}
            onStartNormal={mockStartNormal}
            onStartSRS={mockStartSRS}
            onGoToProgress={mockGoToProgress}
            onQuestionChange={mockQuestionChange}
        />
    )
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
        mockCustomCollectionsState.collections = {}
        mockCustomCollectionsState._hasHydrated = true
    })

    afterEach(() => {
        randomSpy.mockRestore()
        vi.useRealTimers()
    })

    it('renders the mode picker when no mode is selected', () => {
        renderPage({ search: { questionId: undefined, mode: undefined } })

        expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /practice all/i })).toBeInTheDocument()
        expect(screen.queryByRole('textbox', { name: 'Translation answer' })).not.toBeInTheDocument()
    })

    it('renders the game when mode=normal', () => {
        renderPage()

        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Translation answer' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /practice all/i })).not.toBeInTheDocument()
    })

    it('renders the SRS all-done screen when mode=srs and no cards are due', () => {
        mockSRSState.cards = {
            'test:1': reviewedCard('test', '1'),
            'test:2': reviewedCard('test', '2'),
        }

        renderPage({ search: { questionId: undefined, mode: 'srs' } })

        expect(screen.getByRole('heading', { name: 'All caught up!' })).toBeInTheDocument()
        expect(screen.getByText(/Next cards due in/i)).toBeInTheDocument()
        expect(screen.queryByRole('textbox', { name: 'Translation answer' })).not.toBeInTheDocument()
    })

    it('renders the game when mode=srs and cards are due', () => {
        renderPage({ search: { questionId: undefined, mode: 'srs' } })

        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('1 card remaining')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'All caught up!' })).not.toBeInTheDocument()
    })

    it('waits for SRS hydration before rendering a direct SRS session', () => {
        mockSRSState._hasHydrated = false

        renderPage({ search: { questionId: undefined, mode: 'srs' } })

        expect(screen.getByText('Loading SRS...')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'All caught up!' })).not.toBeInTheDocument()
        expect(screen.queryByRole('textbox', { name: 'Translation answer' })).not.toBeInTheDocument()
    })

    it('navigates when the real game advances to the next question', () => {
        renderPage()

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        fireEvent.change(input, { target: { value: 'Hallo' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

        act(() => {
            vi.advanceTimersByTime(5100)
        })

        expect(mockQuestionChange).toHaveBeenCalledWith('2')
    })

    it('navigates to picker when the real SRS game finishes', () => {
        renderPage({
            loaderData: bundledLoaderData({
                ...mockCollection,
                challenges: [{ id: '1', original: 'Hello', translation: 'Hallo' }],
            }),
            search: { questionId: undefined, mode: 'srs' },
        })

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        fireEvent.change(input, { target: { value: 'Hallo' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
        fireEvent.click(screen.getByRole('button', { name: '1d' }))

        act(() => {
            vi.advanceTimersByTime(2100)
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('passes initialQuestionId from URL to TypingGame', () => {
        renderPage({ search: { questionId: '2', mode: 'srs' } })

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
        renderPage({
            loaderData: bundledLoaderData(importedCollection),
            search: {
                questionId: 'ch_mooolutc_843imj',
                mode: 'srs',
            },
        })

        expect(screen.getByText('This is my dog.')).toBeInTheDocument()
        expect(screen.getByText('Das ist')).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Translation gap 1' })).toBeInTheDocument()
        expect(screen.getByText('Hund.')).toBeInTheDocument()
    })

    it('shows a loading state for custom routes while custom collection storage hydrates', () => {
        mockCustomCollectionsState._hasHydrated = false

        renderPage({
            loaderData: customLoaderData('custom_ready'),
            search: { questionId: undefined, mode: undefined },
        })

        expect(screen.getByText('Loading collection...')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Collection not found' })).not.toBeInTheDocument()
    })

    it('renders the mode picker for a hydrated valid custom collection route', () => {
        mockCustomCollectionsState.collections = {
            custom_ready: {
                id: 'custom_ready',
                title: 'Ready custom',
                description: 'Local collection',
                tags: ['Custom'],
                freeInput: true,
                challenges: [
                    { id: 'local_1', original: 'Good day', translation: 'Guten Tag' },
                ],
                createdAt: 1,
                updatedAt: 2,
            },
        }

        renderPage({
            loaderData: customLoaderData('custom_ready'),
            search: { questionId: undefined, mode: undefined },
        })

        expect(screen.getByRole('heading', { name: 'Ready custom' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /practice all/i })).toBeInTheDocument()
        expect(screen.queryByText('Collection not found')).not.toBeInTheDocument()
    })

    it('renders a route-local not-found state for a missing hydrated custom collection route', () => {
        renderPage({
            loaderData: customLoaderData('custom_missing'),
            search: { questionId: undefined, mode: undefined },
        })

        expect(screen.getByRole('heading', { name: 'Collection not found' })).toBeInTheDocument()
        expect(screen.getByText('This custom collection is not saved or is not playable on this device.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    })

    it('passes no initialQuestionId when questionId is absent', () => {
        renderPage()

        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('snapshots due SRS challenges when the session starts', () => {
        mockSRSState.cards = { 'test:2': reviewedCard('test', '2') }

        renderPage({
            loaderData: bundledLoaderData({
                ...mockCollection,
                challenges: [
                    { id: '1', translation: 'one' },
                    { id: '2', translation: 'two' },
                    { id: '3', translation: 'three' },
                ],
            }),
            search: { questionId: undefined, mode: 'srs' },
        })

        expect(screen.getByText(/Hello|Test/)).toBeInTheDocument()
        expect(screen.queryByText('World')).not.toBeInTheDocument()
        expect(screen.getByText('1 card remaining')).toBeInTheDocument()
    })

    it('keeps the active SRS challenge snapshot when cards change mid-session', () => {
        const page = (
            <CollectionGamePage
                loaderData={bundledLoaderData({
                    ...mockCollection,
                    challenges: [
                        { id: '1', translation: 'one' },
                        { id: '2', translation: 'two' },
                        { id: '3', translation: 'three' },
                    ],
                })}
                search={{ questionId: undefined, mode: 'srs' }}
                onGoToPicker={mockNavigate}
                onStartNormal={mockStartNormal}
                onStartSRS={mockStartSRS}
                onGoToProgress={mockGoToProgress}
                onQuestionChange={mockQuestionChange}
            />
        )
        const { rerender } = render(page)

        mockSRSState.cards = {
            'test:1': reviewedCard('test', '1'),
            'test:2': reviewedCard('test', '2'),
            'test:3': reviewedCard('test', '3'),
        }
        rerender(page)

        expect(screen.getByText('2 cards remaining')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'All caught up!' })).not.toBeInTheDocument()
    })

    it('records collection play when a session mode is active', () => {
        renderPage()

        expect(mockSRSState.recordPlay).toHaveBeenCalledWith('test')
    })
})
