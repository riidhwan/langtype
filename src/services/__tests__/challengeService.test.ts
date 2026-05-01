import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('idb-keyval', () => {
    const db = new Map<string, string>()
    return {
        get: vi.fn((key: string) => Promise.resolve(db.get(key))),
        set: vi.fn((key: string, value: string) => { db.set(key, value); return Promise.resolve() }),
        del: vi.fn((key: string) => { db.delete(key); return Promise.resolve() }),
    }
})

import { getCollection, getCollections, getCollectionChallengeIds } from '../challengeService'
import { useCustomCollectionsStore } from '@/store/useCustomCollectionsStore'

describe('challengeService', () => {
    beforeEach(() => {
        useCustomCollectionsStore.setState({ collections: {}, _hasHydrated: true })
    })

    describe('getCollections', () => {
        it('returns all collection metadata from index.json', async () => {
            const collections = await getCollections()
            expect(collections).toBeInstanceOf(Array)
            expect(collections.length).toBeGreaterThan(0)
            expect(collections.find(c => c.id === 'basics')).toBeDefined()
            expect(collections.find(c => c.id === 'shopping_restaurant')).toBeDefined()
        })

        it('includes the dev_test collection in DEV mode', async () => {
            // Vitest runs in DEV mode (import.meta.env.DEV === true)
            const collections = await getCollections()
            expect(collections.find(c => c.id === 'dev_test')).toBeDefined()
        })

        it('includes valid custom collections before built-ins', async () => {
            useCustomCollectionsStore.setState({
                collections: {
                    custom_ready: {
                        id: 'custom_ready',
                        title: 'Ready custom',
                        challenges: [{ id: '1', translation: 'Hallo' }],
                        createdAt: 1,
                        updatedAt: 2,
                    },
                },
                _hasHydrated: true,
            })

            const collections = await getCollections()

            expect(collections[0].id).toBe('custom_ready')
            expect(collections.find(c => c.id === 'custom_ready')).toBeDefined()
        })

        it('excludes invalid custom drafts', async () => {
            useCustomCollectionsStore.setState({
                collections: {
                    custom_draft: {
                        id: 'custom_draft',
                        title: 'Draft',
                        challenges: [],
                        createdAt: 1,
                        updatedAt: 2,
                    },
                },
                _hasHydrated: true,
            })

            const collections = await getCollections()

            expect(collections.find(c => c.id === 'custom_draft')).toBeUndefined()
        })
    })

    describe('getCollection', () => {
        it('loads the basics collection correctly', async () => {
            const collection = await getCollection('basics')
            expect(collection).toBeDefined()
            expect(collection?.id).toBe('basics')
            expect(collection?.challenges).toBeInstanceOf(Array)
        })

        it('loads the shopping_restaurant collection correctly', async () => {
            const collection = await getCollection('shopping_restaurant')
            expect(collection).toBeDefined()
            expect(collection?.id).toBe('shopping_restaurant')
            expect(collection?.challenges).toBeInstanceOf(Array)
        })

        it('returns undefined for non-existent collection', async () => {
            const collection = await getCollection('non_existent')
            expect(collection).toBeUndefined()
        })

        it('loads a valid custom collection from local state', async () => {
            useCustomCollectionsStore.setState({
                collections: {
                    custom_ready: {
                        id: 'custom_ready',
                        title: 'Ready custom',
                        challenges: [
                            { id: '1', translation: 'Hallo' },
                            { id: '2', translation: '   ' },
                        ],
                        createdAt: 1,
                        updatedAt: 2,
                    },
                },
                _hasHydrated: true,
            })

            const collection = await getCollection('custom_ready')

            expect(collection?.title).toBe('Ready custom')
            expect(collection?.challenges).toEqual([{ id: '1', translation: 'Hallo' }])
        })

        it('does not load an invalid custom draft for practice', async () => {
            useCustomCollectionsStore.setState({
                collections: {
                    custom_draft: {
                        id: 'custom_draft',
                        title: '',
                        challenges: [{ id: '1', translation: 'Hallo' }],
                        createdAt: 1,
                        updatedAt: 2,
                    },
                },
                _hasHydrated: true,
            })

            const collection = await getCollection('custom_draft')

            expect(collection).toBeUndefined()
        })
    })

    describe('getCollectionChallengeIds', () => {
        it('returns an array of challenge ids for an existing collection', async () => {
            const ids = await getCollectionChallengeIds('basics')
            expect(ids).toBeInstanceOf(Array)
            expect(ids.length).toBeGreaterThan(0)
            ids.forEach(id => expect(typeof id).toBe('string'))
        })

        it('returns an empty array for a non-existent collection', async () => {
            const ids = await getCollectionChallengeIds('non_existent')
            expect(ids).toEqual([])
        })
    })
})
