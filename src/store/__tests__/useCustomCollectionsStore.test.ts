import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('idb-keyval', () => {
    const db = new Map<string, string>()
    return {
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => { db.set(key, value); return Promise.resolve() }),
        del: vi.fn((key: string) => { db.delete(key); return Promise.resolve() }),
    }
})

import {
    isValidCustomCollection,
    makeChallengeId,
    makeCustomCollectionId,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'

describe('useCustomCollectionsStore', () => {
    beforeEach(() => {
        useCustomCollectionsStore.setState({ collections: {}, _hasHydrated: false })
    })

    it('creates a draft with a custom collection id', () => {
        const draft = useCustomCollectionsStore.getState().createDraft()

        expect(draft.id.startsWith('custom_')).toBe(true)
        expect(useCustomCollectionsStore.getState().collections[draft.id]).toEqual(draft)
    })

    it('upserts a collection and updates updatedAt', () => {
        const draft = useCustomCollectionsStore.getState().createDraft()

        useCustomCollectionsStore.getState().upsertCollection({
            ...draft,
            title: 'German verbs',
            challenges: [{ id: '1', translation: 'gehen' }],
        })

        const stored = useCustomCollectionsStore.getState().collections[draft.id]
        expect(stored.title).toBe('German verbs')
        expect(stored.updatedAt).toBeGreaterThanOrEqual(draft.updatedAt)
    })

    it('deletes a collection', () => {
        const draft = useCustomCollectionsStore.getState().createDraft()

        useCustomCollectionsStore.getState().deleteCollection(draft.id)

        expect(useCustomCollectionsStore.getState().collections[draft.id]).toBeUndefined()
    })

    it('validates only collections with title and a non-empty answer', () => {
        expect(isValidCustomCollection({
            id: 'custom_empty',
            title: '',
            challenges: [{ id: '1', translation: 'Hallo' }],
        })).toBe(false)

        expect(isValidCustomCollection({
            id: 'custom_invalid',
            title: 'Draft',
            challenges: [{ id: '1', translation: '   ' }],
        })).toBe(false)

        expect(isValidCustomCollection({
            id: 'custom_valid',
            title: 'Ready',
            challenges: [{ id: '1', translation: 'Hallo' }],
        })).toBe(true)
    })

    it('filters incomplete challenges from playable collections', () => {
        const playable = toPlayableCollection({
            id: 'custom_ready',
            title: 'Ready',
            challenges: [
                { id: '1', original: 'Hello', translation: 'Hallo' },
                { id: '2', original: 'Empty', translation: '' },
            ],
            createdAt: 1,
            updatedAt: 2,
        })

        expect(playable.challenges).toEqual([{ id: '1', original: 'Hello', translation: 'Hallo' }])
    })

    it('creates ids with the expected prefixes', () => {
        expect(makeCustomCollectionId().startsWith('custom_')).toBe(true)
        expect(makeChallengeId().startsWith('ch_')).toBe(true)
    })
})
