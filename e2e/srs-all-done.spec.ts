import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const COLLECTION_ID = 'netzwerk_neu_a1_k1_nomen_plural'
const COLLECTION_URL = `/collections/${COLLECTION_ID}`
const COLLECTION_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/
const CHALLENGE_IDS = Array.from({ length: 26 }, (_, index) => String(index + 1))

interface SeedSRSPayload {
    collectionId: string
    challengeIds: string[]
    now: number
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

function seedFutureSRSCardsInBrowser({ collectionId, challengeIds, now }: SeedSRSPayload) {
    return new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open('keyval-store', 1)

        openRequest.onupgradeneeded = () => {
            openRequest.result.createObjectStore('keyval')
        }

        openRequest.onerror = () => reject(openRequest.error)

        openRequest.onsuccess = () => {
            const db = openRequest.result
            const transaction = db.transaction('keyval', 'readwrite')
            const store = transaction.objectStore('keyval')
            const nextReviewAt = now + 24 * 60 * 60 * 1000
            const cards: Record<string, {
                collectionId: string
                challengeId: string
                interval: number
                repetitions: number
                easeFactor: number
                nextReviewAt: number
                lastReviewedAt: number
            }> = {}

            for (const challengeId of challengeIds) {
                cards[`${collectionId}:${challengeId}`] = {
                    collectionId,
                    challengeId,
                    interval: 1,
                    repetitions: 1,
                    easeFactor: 2.6,
                    nextReviewAt,
                    lastReviewedAt: now,
                }
            }

            store.put(JSON.stringify({
                state: {
                    cards,
                    lastPlayedAt: {},
                },
                version: 1,
            }), 'langtype-srs-v1')

            transaction.oncomplete = () => {
                db.close()
                resolve()
            }
            transaction.onerror = () => reject(transaction.error)
            transaction.onabort = () => reject(transaction.error)
        }
    })
}

async function seedFutureSRSCards(page: Page) {
    await page.goto('/')

    await page.evaluate(seedFutureSRSCardsInBrowser, {
        collectionId: COLLECTION_ID,
        challengeIds: CHALLENGE_IDS,
        now: Date.now(),
    })
}

test('shows all-done state when SRS has no due cards', async ({ page }) => {
    await seedFutureSRSCards(page)

    await page.goto(`${COLLECTION_URL}?mode=srs`)

    await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible()
    await expect(page.getByText('Next cards due in 24 hours.')).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Back to collection' }).click()

    await expect(page).toHaveURL(new RegExp(`${COLLECTION_URL}$`))
    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByRole('button', { name: /Spaced Repetition\s+Next review in 24h/ })).toBeDisabled()
})
