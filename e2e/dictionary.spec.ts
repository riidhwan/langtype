import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

const DICTIONARY_BASE = '**/dictionary/v2026-05-01'
const SEARCH_INDEX_URL = `${DICTIONARY_BASE}/search-index.json`
const SEARCH_SHARD_URL = `${DICTIONARY_BASE}/search/p676561-00.json`
const ENTRY_BUCKET_URL = `${DICTIONARY_BASE}/entries/0001.json`

const searchItem = {
    id: 'arbeiten-id',
    term: 'gearbeitet',
    matchedTerm: 'gearbeitet',
    normalized: 'gearbeitet',
    lemma: 'arbeiten',
    pos: 'verb',
    matchType: 'form',
    rank: 10,
    entryBucket: '0001',
}

const entry = {
    id: 'arbeiten-id',
    lemma: 'arbeiten',
    normalized: 'arbeiten',
    pos: 'verb',
    senses: ['to work'],
    forms: [
        { form: 'gearbeitet', tags: ['participle', 'past'] },
        { form: 'haben', tags: ['auxiliary'] },
    ],
    details: { pastParticiple: 'gearbeitet' },
    sounds: [],
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

test('searches the dictionary and loads the selected entry on desktop', async ({ page }) => {
    await page.goto('/dictionary', { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    const dictionaryRequests = await stubDictionaryArtifacts(page)

    await expect(page.getByRole('heading', { name: 'German dictionary' })).toBeVisible()
    await expect(page.getByText('Type at least 3 letters.')).toBeVisible()

    await searchFor(page, 'gear')

    const result = page.getByRole('button', {
        name: /arbeiten.*matched gearbeitet.*form.*verb/,
    })
    await expect(result).toBeVisible()
    await result.click()

    await expect(page.getByText('Loading entry...').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'arbeiten' }).first()).toBeVisible()
    await expect(page.getByText('to work').first()).toBeVisible()
    await expect(page.getByText('Past participle').first()).toBeVisible()
    await expect(page.getByText('hat').first()).toBeVisible()
    await expect(page.getByText('gearbeitet').first()).toBeVisible()
    expect(dictionaryRequests()).toEqual([
        'search-index',
        'search-shard',
        'entry-bucket',
    ])
})

test.describe('mobile dictionary entry sheet', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })

    test('opens and closes loaded entry details from search results', async ({ page }) => {
        await page.goto('/dictionary', { waitUntil: 'domcontentloaded' })
        await waitForHydration(page)
        await stubDictionaryArtifacts(page)
        await searchFor(page, 'gear')
        await page.getByRole('button', { name: /arbeiten.*matched gearbeitet/ }).click()

        const dialog = page.getByRole('dialog', { name: 'arbeiten dictionary entry' })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('heading', { name: 'arbeiten' }).first()).toBeVisible()
        await expect(dialog.getByText('to work')).toBeVisible()

        await dialog.getByRole('button', { name: 'Close' }).click()

        await expect(dialog).not.toBeVisible()
    })
})

async function stubDictionaryArtifacts(page: Page) {
    const requests: string[] = []

    await page.route(SEARCH_INDEX_URL, async (route) => {
        requests.push('search-index')
        await fulfillJson(route, { p676561: ['p676561-00.json'] })
    })
    await page.route(SEARCH_SHARD_URL, async (route) => {
        requests.push('search-shard')
        await fulfillJson(route, [searchItem])
    })
    await page.route(ENTRY_BUCKET_URL, async (route) => {
        requests.push('entry-bucket')
        await delay(150)
        await fulfillJson(route, { entries: { 'arbeiten-id': entry } })
    })

    return () => requests
}

async function waitForHydration(page: Page) {
    await page.waitForFunction(() => !Reflect.has(window, '$_TSR'))
    const themeToggle = page.getByRole('button', { name: 'Switch to dark mode' })
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(themeToggle).toBeVisible()
}

async function searchFor(page: Page, query: string) {
    const input = page.getByLabel('Search dictionary')
    await input.click()
    await input.pressSequentially(query)
    await expect(input).toHaveValue(query)
}

async function fulfillJson(route: Route, body: unknown) {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    })
}

async function delay(ms: number) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}
