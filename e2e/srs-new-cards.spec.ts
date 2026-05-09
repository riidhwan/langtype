import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const COLLECTION_URL = '/collections/netzwerk_neu_a1_k1_nomen_plural'
const COLLECTION_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

async function answerCurrentCard(page: Page, article: string, plural: string) {
    const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
    const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })

    await expect(articleGap).toBeVisible()
    await articleGap.fill(article)
    await articleGap.press('Enter')
    await pluralGap.fill(plural)
    await pluralGap.press('Enter')
}

test('starts SRS from the mode picker with new cards', async ({ page }) => {
    await page.goto(COLLECTION_URL)

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()

    const spacedRepetition = page.getByRole('button', {
        name: /Spaced Repetition\s+26 cards due for review/,
    })
    await expect(spacedRepetition).toBeEnabled()
    await spacedRepetition.click()

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('25 cards remaining')).toBeVisible()

    const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
    const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })
    await articleGap.fill('der')
    await articleGap.press('Enter')
    await pluralGap.fill('Namen')
    await pluralGap.press('Enter')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await expect(page.getByText('Review again in:')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ASAP' })).toBeVisible()
    await expect(page.getByRole('button', { name: '1d' })).toBeVisible()
})

test('waits for a correct-answer interval choice before advancing', async ({ page }) => {
    await page.goto(`${COLLECTION_URL}?mode=srs`)

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('25 cards remaining')).toBeVisible()

    await answerCurrentCard(page, 'der', 'Namen')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await expect(page.getByText('Review again in:')).toBeVisible()

    await page.waitForTimeout(5500)

    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('25 cards remaining')).toBeVisible()

    await page.getByRole('button', { name: '1d' }).click()

    await expect(page.getByText('Review in 1d')).toBeVisible()
    await expect(page.getByText('First Name', { exact: true })).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('24 cards remaining')).toBeVisible()
})

test('ASAP interval reinserts the correct card into the active SRS session', async ({ page }) => {
    await page.goto(`${COLLECTION_URL}?mode=srs`)

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('25 cards remaining')).toBeVisible()

    await answerCurrentCard(page, 'der', 'Namen')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await page.evaluate(() => {
        Math.random = () => 0
    })
    await page.getByRole('button', { name: 'ASAP' }).click()
    await expect(page.getByText('Review in ASAP')).toBeVisible()
    await expect(page.getByText('First Name', { exact: true })).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('25 cards remaining')).toBeVisible()

    await answerCurrentCard(page, 'der', 'Vornamen')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await page.getByRole('button', { name: '1d' }).click()
    await expect(page.getByText('Review in 1d')).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible({ timeout: 4000 })
    await expect(page.getByText('24 cards remaining')).toBeVisible()
})
