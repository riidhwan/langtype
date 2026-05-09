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
    await expect(pluralGap).toBeFocused()
    await pluralGap.fill(plural)
    await pluralGap.press('Enter')
}

test('shows due, new, and upcoming cards in the SRS progress view', async ({ page }) => {
    await page.goto(`${COLLECTION_URL}?mode=srs`)

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()

    await answerCurrentCard(page, 'wrong', 'wrong')

    await expect(page.getByText(/incorrect/i)).toBeVisible()
    await expect(page.getByText('First Name', { exact: true })).toBeVisible({ timeout: 7000 })

    await answerCurrentCard(page, 'der', 'Vornamen')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await page.getByRole('button', { name: '3d' }).click()
    await expect(page.getByText('Review in 3d')).toBeVisible()
    await expect(page.getByText('Last Name', { exact: true })).toBeVisible({ timeout: 4000 })

    await page.getByRole('button', { name: 'Back' }).click()

    await expect(page).toHaveURL(new RegExp(`${COLLECTION_URL}$`))
    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await page.getByRole('button', { name: 'View progress' }).click()

    await expect(page).toHaveURL(new RegExp(`${COLLECTION_URL}\\?view=progress$`))
    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
    await expect(page.getByText('1 due')).toBeVisible()
    await expect(page.getByText('24 new')).toBeVisible()
    await expect(page.getByText('1 upcoming')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Due (1)' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Name' }).filter({ hasText: 'Due' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'New (24)' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Last Name' }).filter({ hasText: 'New' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Upcoming (1)' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'First Name' }).filter({ hasText: 'in 3d' })).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()

    await expect(page).toHaveURL(new RegExp(`${COLLECTION_URL}$`))
    await expect(page.getByRole('button', { name: /Practice All/ })).toBeVisible()
})
