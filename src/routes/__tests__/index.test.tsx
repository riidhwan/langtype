import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/config', () => ({ DEFAULT_HOME_TAG: null }))

const mockUseLoaderData = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, className }: any) => <div className={className}>{children}</div>,
        createFileRoute: () => () => ({ useLoaderData: mockUseLoaderData }),
    }
})

const mockSRSState = vi.hoisted(() => ({
    cards: {} as Record<string, any>,
    _hasHydrated: true,
    lastPlayedAt: {} as Record<string, number>,
}))

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) => selector(mockSRSState),
}))

const mockCustomState = vi.hoisted(() => ({
    collections: {} as Record<string, any>,
    _hasHydrated: true,
}))

vi.mock('@/store/useCustomCollectionsStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/store/useCustomCollectionsStore')>()
    return {
        ...actual,
        useCustomCollectionsStore: (selector: (s: any) => any) => selector(mockCustomState),
    }
})

vi.mock('@/lib/srsAlgorithm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/srsAlgorithm')>()
    return { ...actual, isCardDue: vi.fn(() => false) }
})

import { Home } from '../index'

// --- Helpers ---

const col = (id: string, title: string, tags?: string[]) => ({
    id,
    title,
    description: `Description for ${id}`,
    ...(tags ? { tags } : {}),
})

const collections = [
    col('a', 'Alpha', ['X', 'Y']),
    col('b', 'Beta', ['X']),
    col('c', 'Gamma'),         // no tags
]

describe('Home — tag filtering', () => {
    beforeEach(() => {
        mockSRSState.cards = {}
        mockSRSState._hasHydrated = true
        mockSRSState.lastPlayedAt = {}
        mockCustomState.collections = {}
        mockCustomState._hasHydrated = true
        mockUseLoaderData.mockReturnValue({ collections })
    })

    it('renders the custom collection creation entry point', () => {
        render(<Home />)
        expect(screen.getByText('Create collection')).toBeInTheDocument()
    })

    it('renders valid custom collections with a custom marker', () => {
        mockCustomState.collections = {
            custom_ready: {
                id: 'custom_ready',
                title: 'My German Set',
                description: 'Personal practice',
                tags: ['Custom'],
                challenges: [{ id: '1', translation: 'Hallo' }],
                createdAt: 1,
                updatedAt: 2,
            },
        }

        render(<Home />)

        expect(screen.getByText('My German Set')).toBeInTheDocument()
        expect(screen.getAllByText('Custom').length).toBeGreaterThan(0)
    })

    it('hides custom drafts that are not practice-ready', () => {
        mockCustomState.collections = {
            custom_draft: {
                id: 'custom_draft',
                title: 'Incomplete set',
                challenges: [],
                createdAt: 1,
                updatedAt: 2,
            },
        }

        render(<Home />)

        expect(screen.queryByText('Incomplete set')).not.toBeInTheDocument()
    })

    it('does not render tag pills when no collections have tags', () => {
        mockUseLoaderData.mockReturnValue({ collections: [col('a', 'Alpha'), col('b', 'Beta')] })
        render(<Home />)
        expect(screen.queryByRole('button', { name: 'X' })).not.toBeInTheDocument()
    })

    it('renders unique tag pills in encounter order', () => {
        render(<Home />)
        // Alpha introduces X then Y; Beta re-introduces X (deduped)
        const xBtn = screen.getByRole('button', { name: 'X' })
        const yBtn = screen.getByRole('button', { name: 'Y' })
        expect(xBtn).toBeInTheDocument()
        expect(yBtn).toBeInTheDocument()
        // X appears before Y in the DOM
        expect(xBtn.compareDocumentPosition(yBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('filters collections to those with the selected tag', () => {
        render(<Home />)
        fireEvent.click(screen.getByRole('button', { name: 'Y' }))
        expect(screen.getByText('Alpha')).toBeInTheDocument()        // has Y
        expect(screen.queryByText('Beta')).not.toBeInTheDocument()   // only has X
        expect(screen.queryByText('Gamma')).not.toBeInTheDocument()  // no tags
    })

    it('hides untagged collections when a tag is active', () => {
        render(<Home />)
        fireEvent.click(screen.getByRole('button', { name: 'X' }))
        expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    })

    it('shows all collections after clicking the active tag again', () => {
        render(<Home />)
        fireEvent.click(screen.getByRole('button', { name: 'X' }))
        fireEvent.click(screen.getByRole('button', { name: 'X' })) // deselect
        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.getByText('Gamma')).toBeInTheDocument()
    })

    it('applies tag filter AND search together', () => {
        render(<Home />)
        fireEvent.click(screen.getByRole('button', { name: 'X' }))
        fireEvent.change(screen.getByPlaceholderText('Search collections…'), {
            target: { value: 'Alpha' },
        })
        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.queryByText('Beta')).not.toBeInTheDocument()
        expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
    })
})
