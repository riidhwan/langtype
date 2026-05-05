import { expect, test } from '@playwright/test'

const DEEP_LINK_URL = '/collections/netzwerk_neu_a1_k1_nomen_plural?mode=normal&questionId=4'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

test('opens a questionId deep link, syncs the URL, and restores after reload', async ({ page }) => {
    await page.goto(DEEP_LINK_URL)

    await expect(page.getByRole('heading', { name: /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/ })).toBeVisible()
    await expect(page.getByText('Address', { exact: true })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeHidden()
    await expect(page).toHaveURL(/\/collections\/netzwerk_neu_a1_k1_nomen_plural\?mode=normal&questionId=4$/)

    const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
    const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })
    await expect(articleGap).toBeFocused()
    await articleGap.fill('die')
    await articleGap.press('Enter')
    await pluralGap.fill('Adressen')
    await pluralGap.press('Enter')

    await expect(page.getByText('Number', { exact: true })).toBeVisible({ timeout: 7000 })
    await expect(page).toHaveURL(/\/collections\/netzwerk_neu_a1_k1_nomen_plural\?mode=normal&questionId=5$/)

    await page.reload()

    await expect(page.getByText('Number', { exact: true })).toBeVisible()
    await expect(page.getByText('Address', { exact: true })).toBeHidden()
})
