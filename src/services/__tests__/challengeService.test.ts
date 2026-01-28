import { describe, it, expect, vi } from 'vitest'
import { getCollections, getCollection } from '../challengeService'

// Mock the JSON imports
vi.mock('@/data/collections/index.json', () => ({
    default: [{ id: 'basics', title: 'Basics' }]
}))

vi.mock('@/data/collections/basics.json', () => ({
    default: { id: 'basics', title: 'Basics', challenges: [] }
}))

vi.mock('@/data/collections/casual_german_a2.json', () => ({
    default: { id: 'casual_german_a2', title: 'Casual', challenges: [] }
}))

vi.mock('@/data/collections/tech.json', () => ({
    default: { id: 'tech', title: 'Tech', challenges: [] }
}))

describe('challengeService', () => {
    describe('getCollections', () => {
        it('returns the index collection list', async () => {
            const collections = await getCollections()
            expect(collections).toHaveLength(1)
            expect(collections[0]).toEqual({ id: 'basics', title: 'Basics' })
        })
    })

    describe('getCollection', () => {
        it('returns the correct collection for a valid ID', async () => {
            const collection = await getCollection('basics')
            expect(collection).toBeDefined()
            expect(collection?.id).toBe('basics')
        })

        it('returns undefined for an invalid ID', async () => {
            const collection = await getCollection('invalid-id')
            expect(collection).toBeUndefined()
        })
    })
})
