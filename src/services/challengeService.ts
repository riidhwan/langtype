import { Collection } from '@/types/challenge'
import indexData from '@/data/collections/index.json'
import {
    isCustomCollectionId,
    isValidCustomCollection,
    toPlayableCollection,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'

// Lazy-loaded: each collection is a separate chunk, fetched only when requested.
// index.json is excluded here — it is already statically imported above as indexData.
const collections = import.meta.glob<{ default: Collection }>([
    '../data/collections/*.json',
    '!../data/collections/index.json',
])

export async function getCollections(): Promise<Collection[]> {
    const all = indexData as Collection[]
    const customCollections = getPlayableCustomCollections()
    if (import.meta.env.DEV) {
        return [...customCollections, ...all, { id: 'dev_test', title: '[DEV] Test Collection', description: 'Small set for testing features in development.', freeInput: true }]
    }
    return [...customCollections, ...all]
}

export async function getCollection(id: string): Promise<Collection | undefined> {
    if (isCustomCollectionId(id)) {
        const collection = useCustomCollectionsStore.getState().getCollection(id)
        if (!collection || !isValidCustomCollection(collection)) return undefined
        return toPlayableCollection(collection)
    }

    const loader = collections[`../data/collections/${id}.json`]
    if (!loader) return undefined
    const mod = await loader()
    return mod.default
}

export async function getCollectionChallengeIds(id: string): Promise<string[]> {
    const collection = await getCollection(id)
    return collection?.challenges?.map((c) => c.id) ?? []
}

function getPlayableCustomCollections(): Collection[] {
    return useCustomCollectionsStore
        .getState()
        .getCollections()
        .filter(isValidCustomCollection)
        .map(toPlayableCollection)
}
