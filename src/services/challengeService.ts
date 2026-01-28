import { Collection } from '@/types/challenge'
import indexData from '@/data/collections/index.json'

// Dynamically import all collection JSON files
const collections = import.meta.glob<{ default: Collection }>('../data/collections/*.json', {
    eager: true,
})

export async function getCollections(): Promise<Collection[]> {
    return indexData as Collection[]
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    // Exact match for the filename (ignoring path and extension)
    const entry = Object.entries(collections).find(([path]) => {
        const fileName = path.split('/').pop()?.replace('.json', '')
        return fileName === id
    })

    return entry ? entry[1].default : undefined
}
