import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import type { SRSCard, SRSGrade } from '@/types/srs'
import { createNewCard, computeReview, computeReviewFromInterval } from '@/lib/srsAlgorithm'

interface SRSState {
    cards: Record<string, SRSCard>
    lastPlayedAt: Record<string, number>
    _hasHydrated: boolean
}

interface SRSActions {
    recordReview: (collectionId: string, challengeId: string, grade: SRSGrade) => void
    recordReviewWithInterval: (collectionId: string, challengeId: string, intervalDays: number) => void
    recordPlay: (collectionId: string) => void
    getCard: (collectionId: string, challengeId: string) => SRSCard | undefined
    resetCollection: (collectionId: string) => void
    resetAll: () => void
    setHasHydrated: (value: boolean) => void
}

export type SRSStore = SRSState & SRSActions

export const useSRSStore = create<SRSStore>()(
    persist(
        (set, get) => ({
            cards: {},
            lastPlayedAt: {},
            _hasHydrated: false,

            recordReviewWithInterval(collectionId, challengeId, intervalDays) {
                const key = `${collectionId}:${challengeId}`
                const existing = get().cards[key] ?? createNewCard(collectionId, challengeId)
                const updates = computeReviewFromInterval(existing, intervalDays)
                set((state) => ({
                    cards: {
                        ...state.cards,
                        [key]: { ...existing, ...updates },
                    },
                }))
            },

            recordPlay(collectionId) {
                set((state) => ({
                    lastPlayedAt: { ...state.lastPlayedAt, [collectionId]: Date.now() },
                }))
            },

            recordReview(collectionId, challengeId, grade) {
                const key = `${collectionId}:${challengeId}`
                const existing = get().cards[key] ?? createNewCard(collectionId, challengeId)
                const updates = computeReview(existing, grade)
                set((state) => ({
                    cards: {
                        ...state.cards,
                        [key]: { ...existing, ...updates },
                    },
                }))
            },

            getCard(collectionId, challengeId) {
                return get().cards[`${collectionId}:${challengeId}`]
            },

            resetCollection(collectionId) {
                set((state) => {
                    const prefix = `${collectionId}:`
                    const newCards = Object.fromEntries(
                        Object.entries(state.cards).filter(([key]) => !key.startsWith(prefix))
                    )
                    return { cards: newCards }
                })
            },

            resetAll() {
                set({ cards: {} })
            },

            setHasHydrated(value) {
                set({ _hasHydrated: value })
            },
        }),
        {
            name: 'langtype-srs-v1',
            storage: createJSONStorage(() => ({
                getItem: (name) => get<string>(name).then((v) => v ?? null),
                setItem: (name, value) => set(name, value),
                removeItem: (name) => del(name),
            })),
            version: 1,
            skipHydration: true,
            partialize: (state) => ({ cards: state.cards, lastPlayedAt: state.lastPlayedAt }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
        },
    ),
)
