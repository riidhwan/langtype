import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import type { Challenge, Collection } from '@/types/challenge'

export const CUSTOM_COLLECTION_PREFIX = 'custom_'

export type CustomCollection = Collection & {
    createdAt: number
    updatedAt: number
}

interface CustomCollectionsState {
    collections: Record<string, CustomCollection>
    _hasHydrated: boolean
}

interface CustomCollectionsActions {
    createDraft: () => CustomCollection
    upsertCollection: (collection: CustomCollection) => void
    deleteCollection: (id: string) => void
    getCollection: (id: string) => CustomCollection | undefined
    getCollections: () => CustomCollection[]
    setHasHydrated: (value: boolean) => void
}

export type CustomCollectionsStore = CustomCollectionsState & CustomCollectionsActions

export function makeCustomCollectionId(now = Date.now()): string {
    const random = Math.random().toString(36).slice(2, 8)
    return `${CUSTOM_COLLECTION_PREFIX}${now.toString(36)}_${random}`
}

export function makeChallengeId(now = Date.now()): string {
    const random = Math.random().toString(36).slice(2, 8)
    return `ch_${now.toString(36)}_${random}`
}

export function isCustomCollectionId(id: string): boolean {
    return id.startsWith(CUSTOM_COLLECTION_PREFIX)
}

export function isValidCustomCollection(collection: Collection): boolean {
    return Boolean(
        collection.title.trim()
        && (collection.challenges ?? []).some((challenge) => isValidChallenge(challenge))
    )
}

export function isValidChallenge(challenge: Challenge): boolean {
    return challenge.translation.trim().length > 0
}

export function toPlayableCollection(collection: CustomCollection): Collection {
    return {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        tags: collection.tags,
        freeInput: collection.freeInput,
        challenges: collection.challenges?.filter(isValidChallenge) ?? [],
    }
}

function createEmptyDraft(): CustomCollection {
    const now = Date.now()
    return {
        id: makeCustomCollectionId(now),
        title: '',
        description: '',
        tags: ['Custom'],
        freeInput: true,
        challenges: [],
        createdAt: now,
        updatedAt: now,
    }
}

export const useCustomCollectionsStore = create<CustomCollectionsStore>()(
    persist(
        (set, get) => ({
            collections: {},
            _hasHydrated: false,

            createDraft() {
                const draft = createEmptyDraft()
                set((state) => ({
                    collections: {
                        ...state.collections,
                        [draft.id]: draft,
                    },
                }))
                return draft
            },

            upsertCollection(collection) {
                const updatedAt = Date.now()
                set((state) => ({
                    collections: {
                        ...state.collections,
                        [collection.id]: {
                            ...collection,
                            updatedAt,
                            createdAt: collection.createdAt || updatedAt,
                        },
                    },
                }))
            },

            deleteCollection(id) {
                set((state) => {
                    const remaining = { ...state.collections }
                    delete remaining[id]
                    return { collections: remaining }
                })
            },

            getCollection(id) {
                return get().collections[id]
            },

            getCollections() {
                return Object.values(get().collections)
                    .sort((a, b) => b.updatedAt - a.updatedAt)
            },

            setHasHydrated(value) {
                set({ _hasHydrated: value })
            },
        }),
        {
            name: 'langtype-custom-collections-v1',
            storage: createJSONStorage(() => ({
                getItem: (name) => get<string>(name).then((v) => v ?? null),
                setItem: (name, value) => set(name, value),
                removeItem: (name) => del(name),
            })),
            version: 1,
            skipHydration: true,
            partialize: (state) => ({ collections: state.collections }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
        },
    ),
)
