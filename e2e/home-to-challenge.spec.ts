import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

test('starts on the homepage and completes one practice challenge', async ({ page }) => {
    await page.goto('/')

    const collectionTitle = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/
    const collection = page.getByRole('link', { name: collectionTitle })
    await expect(collection).toBeVisible()
    await collection.click()

    await expect(page.getByRole('heading', { name: collectionTitle })).toBeVisible()

    const practiceAll = page.getByRole('button', { name: /Practice All/ })
    await expect(practiceAll).toBeVisible()
    await practiceAll.click()

    await expect(page.getByRole('heading', { name: collectionTitle })).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText(/press\s+enter\s+to check/i)).toBeVisible()

    const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
    const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })
    await expect(articleGap).toBeVisible()
    await articleGap.fill('der')
    await articleGap.press('Enter')
    await pluralGap.fill('Namen')
    await pluralGap.press('Enter')

    await expect(page.getByText(/correct/i)).toBeVisible()
})
