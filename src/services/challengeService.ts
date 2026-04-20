import { Collection } from '@/types/challenge'
import indexData from '@/data/collections/index.json'

// Dynamically import all collection JSON files
const collections = import.meta.glob<{ default: Collection }>('../data/collections/*.json', {
    eager: true,
})

export async function getCollections(): Promise<Collection[]> {
    const all = indexData as Collection[]
    if (import.meta.env.DEV) {
        return [...all, { id: 'dev_test', title: '[DEV] Test Collection', description: 'Small set for testing features in development.' }]
    }
    return all
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    // Exact match for the filename (ignoring path and extension)
    const entry = Object.entries(collections).find(([path]) => {
        const fileName = path.split('/').pop()?.replace('.json', '')
        return fileName === id
    })

    return entry ? entry[1].default : undefined
}

export async function getCollectionChallengeIds(id: string): Promise<string[]> {
    const collection = await getCollection(id)
    return collection?.challenges?.map((c) => c.id) ?? []
}
