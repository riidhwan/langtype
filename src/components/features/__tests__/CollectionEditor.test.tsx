import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CollectionEditor } from '../CollectionEditor'
import { useCustomCollectionsStore, type CustomCollection } from '@/store/useCustomCollectionsStore'
import type { SRSStore } from '@/store/useSRSStore'
import type { ReactNode } from 'react'

interface MockLinkProps {
    children: ReactNode
    className?: string
}

vi.mock('idb-keyval', () => {
    const db = new Map<string, string>()
    return {
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => { db.set(key, value); return Promise.resolve() }),
        del: vi.fn((key: string) => { db.delete(key); return Promise.resolve() }),
    }
})

const navigate = vi.hoisted(() => vi.fn())
const resetCollection = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, className }: MockLinkProps) => <a className={className}>{children}</a>,
        useNavigate: () => navigate,
    }
})

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: <T,>(selector: (state: Pick<SRSStore, 'resetCollection'>) => T) => selector({ resetCollection }),
}))

const baseCollection: CustomCollection = {
    id: 'custom_ready',
    title: 'Ready',
    description: '',
    tags: ['Custom'],
    freeInput: true,
    challenges: [{ id: '1', original: 'Hello', translation: 'Hallo' }],
    createdAt: 1,
    updatedAt: 2,
}

describe('CollectionEditor', () => {
    beforeEach(() => {
        navigate.mockReset()
        resetCollection.mockReset()
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        useCustomCollectionsStore.setState({
            collections: { [baseCollection.id]: baseCollection },
            _hasHydrated: true,
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('updates collection fields', () => {
        const { rerender } = render(<CollectionEditor collection={baseCollection} />)

        fireEvent.change(screen.getByPlaceholderText('German A1 review'), {
            target: { value: 'My set' },
        })
        rerender(<CollectionEditor collection={useCustomCollectionsStore.getState().collections.custom_ready} />)
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: 'slots' },
        })
        rerender(<CollectionEditor collection={useCustomCollectionsStore.getState().collections.custom_ready} />)
        fireEvent.change(screen.getByPlaceholderText('Short note about what this collection practices'), {
            target: { value: 'Practice polite phrases' },
        })

        const collection = useCustomCollectionsStore.getState().collections.custom_ready

        expect(collection.title).toBe('My set')
        expect(collection.freeInput).toBe(false)
        expect(collection.description).toBe('Practice polite phrases')
    })

    it('adds multiple tags from comma-separated input', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.change(screen.getByPlaceholderText('Add tag'), {
            target: { value: 'A1, verbs, custom' },
        })

        expect(useCustomCollectionsStore.getState().collections.custom_ready.tags).toEqual(['Custom', 'A1', 'verbs'])
    })

    it('adds a tag with Enter', () => {
        render(<CollectionEditor collection={baseCollection} />)

        const tagInput = screen.getByPlaceholderText('Add tag')
        fireEvent.change(tagInput, {
            target: { value: 'grammar' },
        })
        fireEvent.keyDown(tagInput, { key: 'Enter' })

        expect(useCustomCollectionsStore.getState().collections.custom_ready.tags).toEqual(['Custom', 'grammar'])
    })

    it('removes a tag', () => {
        const collection = { ...baseCollection, tags: ['Custom', 'A1', 'verbs'] }
        useCustomCollectionsStore.setState({
            collections: { [collection.id]: collection },
            _hasHydrated: true,
        })

        render(<CollectionEditor collection={collection} />)

        fireEvent.click(screen.getByTitle('Remove A1'))

        expect(useCustomCollectionsStore.getState().collections.custom_ready.tags).toEqual(['Custom', 'verbs'])
    })

    it('adds and edits a challenge', () => {
        const emptyCollection = { ...baseCollection, challenges: [] }
        useCustomCollectionsStore.setState({
            collections: { [emptyCollection.id]: emptyCollection },
            _hasHydrated: true,
        })
        const { rerender } = render(<CollectionEditor collection={emptyCollection} />)

        fireEvent.click(screen.getByRole('button', { name: /add/i }))

        const added = useCustomCollectionsStore.getState().collections.custom_ready.challenges?.[0]
        expect(added).toBeDefined()

        rerender(<CollectionEditor collection={useCustomCollectionsStore.getState().collections.custom_ready} />)
        fireEvent.change(screen.getByPlaceholderText('Optional source text'), {
            target: { value: 'Good morning' },
        })
        rerender(<CollectionEditor collection={useCustomCollectionsStore.getState().collections.custom_ready} />)
        fireEvent.change(screen.getByPlaceholderText('Required answer'), {
            target: { value: 'Guten Morgen' },
        })

        expect(useCustomCollectionsStore.getState().collections.custom_ready.challenges?.[0]).toMatchObject({
            original: 'Good morning',
            translation: 'Guten Morgen',
        })
    })

    it('reorders and deletes challenges after confirmation', () => {
        const collection = {
            ...baseCollection,
            challenges: [
                { id: '1', original: 'One', translation: 'Eins' },
                { id: '2', original: 'Two', translation: 'Zwei' },
            ],
        }
        useCustomCollectionsStore.setState({
            collections: { [collection.id]: collection },
            _hasHydrated: true,
        })
        const { rerender } = render(<CollectionEditor collection={collection} />)

        fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0])

        expect(useCustomCollectionsStore.getState().collections.custom_ready.challenges?.map((challenge) => challenge.id)).toEqual(['2', '1'])

        rerender(<CollectionEditor collection={useCustomCollectionsStore.getState().collections.custom_ready} />)
        fireEvent.click(screen.getAllByRole('button', { name: 'Delete challenge' })[0])

        expect(window.confirm).toHaveBeenCalledWith('Delete this challenge?')
        expect(useCustomCollectionsStore.getState().collections.custom_ready.challenges?.map((challenge) => challenge.id)).toEqual(['1'])
    })

    it('keeps a challenge when delete confirmation is canceled', () => {
        vi.mocked(window.confirm).mockReturnValue(false)
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Delete challenge' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete this challenge?')
        expect(useCustomCollectionsStore.getState().collections.custom_ready.challenges).toHaveLength(1)
    })

    it('generates an AI chat import prompt from the settings', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Import from AI chat' }))
        fireEvent.change(screen.getByPlaceholderText('Practice ordering food with separable verbs'), {
            target: { value: 'Practice restaurant phrases' },
        })
        fireEvent.change(screen.getByDisplayValue('10'), {
            target: { value: '7' },
        })
        fireEvent.change(screen.getByPlaceholderText('Optional, for example A2 casual speech'), {
            target: { value: 'A2 casual' },
        })

        const prompt = screen.getByLabelText('copy prompt') as HTMLTextAreaElement

        expect(prompt.value).toContain('Create 7 German translation typing challenges.')
        expect(prompt.value).toContain('Return only one JSON code block and no explanation.')
        expect(prompt.value).toContain('These are fill-in-the-blank challenges')
        expect(prompt.value).toContain('"segments"')
        expect(prompt.value).toContain('"kind":"prefill"')
        expect(prompt.value).toContain('"kind":"type"')
        expect(prompt.value).toContain('A2 casual')
    })

    it('previews valid pasted AI chat JSON and appends imported challenges', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Import from AI chat' }))
        fireEvent.change(screen.getByPlaceholderText(/Can you help me/), {
            target: {
                value: JSON.stringify([
                    {
                        original: 'Can you help me?',
                        segments: [
                            { kind: 'prefill', text: 'Kannst du ' },
                            { kind: 'type', text: 'mir helfen' },
                            { kind: 'prefill', text: '?' },
                        ],
                    },
                ]),
            },
        })

        expect(screen.getByText('1 valid, 0 skipped')).toBeInTheDocument()
        expect(screen.getByText('Can you help me?')).toBeInTheDocument()
        expect(screen.getByText('(Kannst du )mir helfen(?)')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Insert 1 challenges' }))

        const challenges = useCustomCollectionsStore.getState().collections.custom_ready.challenges ?? []
        expect(challenges).toHaveLength(2)
        expect(challenges[1]).toMatchObject({
            original: 'Can you help me?',
            translation: '(Kannst du )mir helfen(?)',
        })
        expect(challenges[1].id).toMatch(/^ch_/)
    })

    it('shows invalid AI chat JSON errors without mutating challenges', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Import from AI chat' }))
        fireEvent.change(screen.getByPlaceholderText(/Can you help me/), {
            target: { value: '[{' },
        })

        expect(screen.getByText('The pasted JSON could not be parsed.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Insert challenges' })).toBeDisabled()
        expect(useCustomCollectionsStore.getState().collections.custom_ready.challenges).toEqual(baseCollection.challenges)
    })

    it('deletes the collection and resets its progress after confirmation', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete this custom collection and its progress?')
        expect(useCustomCollectionsStore.getState().collections.custom_ready).toBeUndefined()
        expect(resetCollection).toHaveBeenCalledWith('custom_ready')
        expect(navigate).toHaveBeenCalledWith({ to: '/' })
    })

    it('keeps the collection when delete confirmation is canceled', () => {
        vi.mocked(window.confirm).mockReturnValue(false)
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete this custom collection and its progress?')
        expect(useCustomCollectionsStore.getState().collections.custom_ready).toBeDefined()
        expect(resetCollection).not.toHaveBeenCalled()
        expect(navigate).not.toHaveBeenCalled()
    })
})
