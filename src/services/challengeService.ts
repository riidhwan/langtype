import { Collection } from '@/types/challenge'
import indexData from '@/data/collections/index.json'
import basicsData from '@/data/collections/basics.json'
import casualGermanA2Data from '@/data/collections/casual_german_a2.json'
import techData from '@/data/collections/tech.json'

const collectionsMap: Record<string, Collection> = {
    basics: basicsData as Collection,
    casual_german_a2: casualGermanA2Data as Collection,
    tech: techData as Collection,
}

export async function getCollections(): Promise<Collection[]> {
    return indexData as Collection[]
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    return collectionsMap[id]
}
