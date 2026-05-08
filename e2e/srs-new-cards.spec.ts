import { expect, test } from '@playwright/test'

const COLLECTION_URL = '/collections/netzwerk_neu_a1_k1_nomen_plural'
const COLLECTION_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

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
