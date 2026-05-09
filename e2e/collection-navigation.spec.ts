import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const BUNDLED_COLLECTION_ID = 'netzwerk_neu_a1_k1_nomen_plural'
const BUNDLED_COLLECTION_URL = `/collections/${BUNDLED_COLLECTION_ID}`
const BUNDLED_COLLECTION_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/
const CUSTOM_COLLECTION_ID = 'custom_navigation_deep_link'
const CUSTOM_COLLECTION_URL = `/collections/${CUSTOM_COLLECTION_ID}`
const CUSTOM_COLLECTION_TITLE = 'Navigation e2e custom collection'

interface SeedCustomCollectionPayload {
    id: string
    title: string
    now: number
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

function seedCustomCollectionInBrowser({ id, title, now }: SeedCustomCollectionPayload) {
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

            store.put(JSON.stringify({
                state: {
                    collections: {
                        [id]: {
                            id,
                            title,
                            description: 'Seeded directly into persisted custom collection storage',
                            tags: ['Custom'],
                            freeInput: true,
                            challenges: [
                                {
                                    id: 'custom_navigation_challenge',
                                    original: 'Say thanks',
                                    translation: 'Danke',
                                },
                            ],
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                },
                version: 1,
            }), 'langtype-custom-collections-v1')

            transaction.oncomplete = () => {
                db.close()
                resolve()
            }
            transaction.onerror = () => reject(transaction.error)
            transaction.onabort = () => reject(transaction.error)
        }
    })
}

async function seedCustomCollection(page: Page, payload: Omit<SeedCustomCollectionPayload, 'now'>) {
    await page.goto('/')

    await page.evaluate(seedCustomCollectionInBrowser, {
        ...payload,
        now: Date.now(),
    })
}

test('back button from the game clears collection search params and returns to the mode picker', async ({ page }) => {
    await page.goto(`${BUNDLED_COLLECTION_URL}?mode=normal`)

    await expect(page.getByRole('heading', { name: BUNDLED_COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()

    await expect(page).toHaveURL(new RegExp(`${BUNDLED_COLLECTION_URL}$`))
    await expect(page.getByRole('heading', { name: BUNDLED_COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByRole('button', { name: /Practice All/ })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toHaveCount(0)
})

test('direct custom collection deep link waits for persisted collection hydration', async ({ page }) => {
    await seedCustomCollection(page, {
        id: CUSTOM_COLLECTION_ID,
        title: CUSTOM_COLLECTION_TITLE,
    })

    await page.goto(`${CUSTOM_COLLECTION_URL}?mode=normal`)

    await expect(page.getByRole('heading', { name: CUSTOM_COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Say thanks')).toBeVisible()
    await expect(page.getByText('Collection not found')).toHaveCount(0)
})

test('missing custom collection deep link shows route-local not-found state', async ({ page }) => {
    await page.goto('/collections/custom_missing_navigation_deep_link')

    await expect(page.getByRole('heading', { name: 'Collection not found' })).toBeVisible()
    await expect(page.getByText('This custom collection is not saved or is not playable on this device.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
})
