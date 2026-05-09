import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const K1_ID = 'netzwerk_neu_a1_k1_nomen_plural'
const K12_ID = 'netzwerk_neu_a1_k12_nomen_plural'

const K1_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/
const K2_TITLE = /Netzwerk Neu A1.*Kapitel 2: Artikel \+ Plural/
const K12_TITLE = /Netzwerk Neu A1.*Kapitel 12: Artikel \+ Plural/

interface SeedSRSHomeStatePayload {
    dueCollectionId: string
    recentCollectionId: string
    olderCollectionId: string
    now: number
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

function seedSRSHomeStateInBrowser({
    dueCollectionId,
    recentCollectionId,
    olderCollectionId,
    now,
}: SeedSRSHomeStatePayload) {
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
                    cards: {
                        [`${dueCollectionId}:1`]: {
                            collectionId: dueCollectionId,
                            challengeId: '1',
                            interval: 0,
                            repetitions: 0,
                            easeFactor: 2.3,
                            nextReviewAt: now - 60_000,
                            lastReviewedAt: now - 120_000,
                        },
                    },
                    lastPlayedAt: {
                        [recentCollectionId]: now,
                        [olderCollectionId]: now - 60_000,
                    },
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

async function seedSRSHomeState(page: Page) {
    await page.goto('/')

    await page.evaluate(seedSRSHomeStateInBrowser, {
        dueCollectionId: K1_ID,
        recentCollectionId: K12_ID,
        olderCollectionId: K1_ID,
        now: Date.now(),
    })
}

test('filters home collections by title, description, and tags', async ({ page }) => {
    await page.goto('/')

    const search = page.getByPlaceholder(/Search collections/)
    const k12Collection = page.getByRole('link', { name: K12_TITLE })
    const k1Collection = page.getByRole('link', { name: K1_TITLE })
    const diningCollection = page.getByRole('link', { name: /Dining and Shopping/ })

    await expect(k1Collection).toBeVisible()
    await expect(diningCollection).toHaveCount(0)

    await search.fill('Kapitel 12')

    await expect(k12Collection).toBeVisible()
    await expect(k1Collection).toHaveCount(0)

    await page.getByRole('button', { name: 'Clear search' }).click()
    await page.getByRole('button', { name: 'Netzwerk Neu', exact: true }).click()
    await search.fill('ordering food')

    await expect(diningCollection).toBeVisible()
    await expect(page.getByRole('link', { name: /German Basics/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'A1', exact: true }).click()

    await expect(diningCollection).toHaveCount(0)

    await page.getByRole('button', { name: 'A1', exact: true }).click()

    await expect(diningCollection).toBeVisible()
})

test('filters due collections and applies last-played sorting after hydration', async ({ page }) => {
    await seedSRSHomeState(page)
    await page.goto('/')

    await expect(page.locator(`a[href="/collections/${K12_ID}"]`)).toBeVisible()
    await expect(page.locator('a[href^="/collections/"]').first()).toHaveAttribute(
        'href',
        `/collections/${K12_ID}`,
    )

    await page.getByRole('button', { name: 'Due (1)' }).click()

    await expect(page.getByRole('link', { name: K1_TITLE })).toBeVisible()
    await expect(page.getByRole('link', { name: K2_TITLE })).toHaveCount(0)
    await expect(page.getByRole('link', { name: K12_TITLE })).toHaveCount(0)
    await expect(page.getByText('1 due')).toBeVisible()
})
