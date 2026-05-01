import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollectionEditor } from '../CollectionEditor'
import { useCustomCollectionsStore, type CustomCollection } from '@/store/useCustomCollectionsStore'

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
        Link: ({ children, className }: any) => <a className={className}>{children}</a>,
        useNavigate: () => navigate,
    }
})

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) => selector({ resetCollection }),
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

    it('updates collection fields', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.change(screen.getByPlaceholderText('German A1 review'), {
            target: { value: 'My set' },
        })

        expect(useCustomCollectionsStore.getState().collections.custom_ready.title).toBe('My set')
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
        render(<CollectionEditor collection={{ ...baseCollection, challenges: [] }} />)

        fireEvent.click(screen.getByRole('button', { name: /add/i }))

        const added = useCustomCollectionsStore.getState().collections.custom_ready.challenges?.[0]
        expect(added).toBeDefined()
    })

    it('deletes the collection and resets its progress after confirmation', () => {
        render(<CollectionEditor collection={baseCollection} />)

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete this custom collection and its progress?')
        expect(useCustomCollectionsStore.getState().collections.custom_ready).toBeUndefined()
        expect(resetCollection).toHaveBeenCalledWith('custom_ready')
        expect(navigate).toHaveBeenCalledWith({ to: '/' })
    })
})
