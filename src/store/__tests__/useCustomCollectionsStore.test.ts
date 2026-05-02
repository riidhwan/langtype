import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const idb = vi.hoisted(() => {
    const db = new Map<string, string>()
    return {
        db,
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => {
            db.set(key, value)
            return Promise.resolve()
        }),
        del: vi.fn((key: string) => {
            db.delete(key)
            return Promise.resolve()
        }),
    }
})

vi.mock('idb-keyval', () => ({
    get: idb.get,
    set: idb.set,
    del: idb.del,
}))

import { del, set } from 'idb-keyval'
import {
    isValidCustomCollection,
    makeChallengeId,
    makeCustomCollectionId,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'

describe('useCustomCollectionsStore', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-05-02T12:00:00.000Z'))
        vi.spyOn(Math, 'random').mockReturnValue(0.123456)
        idb.db.clear()
        vi.clearAllMocks()
        useCustomCollectionsStore.setState({ collections: {}, _hasHydrated: false })
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('creates a draft with a custom collection id', () => {
        const draft = useCustomCollectionsStore.getState().createDraft()

        expect(draft.id).toBe('custom_mooahs00_4fzyo8')
        expect(draft.createdAt).toBe(new Date('2026-05-02T12:00:00.000Z').getTime())
        expect(draft.updatedAt).toBe(new Date('2026-05-02T12:00:00.000Z').getTime())
        expect(useCustomCollectionsStore.getState().collections[draft.id]).toEqual(draft)
    })

    it('upserts a collection and updates updatedAt', () => {
        const draft = useCustomCollectionsStore.getState().createDraft()

        vi.setSystemTime(new Date('2026-05-02T12:05:00.000Z'))
        useCustomCollectionsStore.getState().upsertCollection({
            ...draft,
            title: 'German verbs',
            challenges: [{ id: '1', translation: 'gehen' }],
        })

        const stored = useCustomCollectionsStore.getState().collections[draft.id]
        expect(stored.title).toBe('German verbs')
        expect(stored.createdAt).toBe(draft.createdAt)
        expect(stored.updatedAt).toBe(new Date('2026-05-02T12:05:00.000Z').getTime())
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
        expect(makeCustomCollectionId()).toBe('custom_mooahs00_4fzyo8')
        expect(makeChallengeId()).toBe('ch_mooahs00_4fzyo8')
    })

    describe('persistence', () => {
        it('persists collections without runtime hydration state', async () => {
            const draft = useCustomCollectionsStore.getState().createDraft()
            useCustomCollectionsStore.getState().setHasHydrated(true)

            await vi.waitFor(() => {
                expect(set).toHaveBeenCalledWith('langtype-custom-collections-v1', expect.any(String))
            })

            const persistedValue = vi.mocked(set).mock.calls.at(-1)?.[1] as string
            expect(JSON.parse(persistedValue)).toEqual({
                state: {
                    collections: {
                        [draft.id]: draft,
                    },
                },
                version: 1,
            })
        })

        it('hydrates persisted collections and marks hydration complete', async () => {
            idb.db.set('langtype-custom-collections-v1', JSON.stringify({
                state: {
                    collections: {
                        custom_saved: {
                            id: 'custom_saved',
                            title: 'Saved collection',
                            description: 'Imported from storage',
                            tags: ['Custom'],
                            freeInput: true,
                            challenges: [{ id: 'ch_saved', translation: 'Hallo' }],
                            createdAt: 1_777_550_400_000,
                            updatedAt: 1_777_809_600_000,
                        },
                    },
                },
                version: 1,
            }))

            await useCustomCollectionsStore.persist.rehydrate()

            expect(useCustomCollectionsStore.getState().collections.custom_saved).toMatchObject({
                id: 'custom_saved',
                title: 'Saved collection',
            })
            expect(useCustomCollectionsStore.getState()._hasHydrated).toBe(true)
        })

        it('removes persisted storage through the store boundary', async () => {
            await useCustomCollectionsStore.persist.clearStorage()

            expect(del).toHaveBeenCalledWith('langtype-custom-collections-v1')
        })
    })
})
