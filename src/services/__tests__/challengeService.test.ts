import { describe, it, expect } from 'vitest'
import { getCollection, getCollections } from '../challengeService'

describe('challengeService', () => {
    describe('getCollections', () => {
        it('returns all collection metadata from index.json', async () => {
            const collections = await getCollections()
            expect(collections).toBeInstanceOf(Array)
            expect(collections.length).toBeGreaterThan(0)
            expect(collections.find(c => c.id === 'basics')).toBeDefined()
            expect(collections.find(c => c.id === 'shopping_restaurant')).toBeDefined()
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
    })
})
