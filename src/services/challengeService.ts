import { Collection } from '@/types/challenge'
import indexData from '@/data/collections/index.json'

// Lazy-loaded: each collection is a separate chunk, fetched only when requested.
// index.json is excluded here — it is already statically imported above as indexData.
const collections = import.meta.glob<{ default: Collection }>([
    '../data/collections/*.json',
    '!../data/collections/index.json',
])

export async function getCollections(): Promise<Collection[]> {
    const all = indexData as Collection[]
    if (import.meta.env.DEV) {
        return [...all, { id: 'dev_test', title: '[DEV] Test Collection', description: 'Small set for testing features in development.' }]
    }
    return all
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    const loader = collections[`../data/collections/${id}.json`]
    if (!loader) return undefined
    const mod = await loader()
    return mod.default
}

export async function getCollectionChallengeIds(id: string): Promise<string[]> {
    const collection = await getCollection(id)
    return collection?.challenges?.map((c) => c.id) ?? []
}
