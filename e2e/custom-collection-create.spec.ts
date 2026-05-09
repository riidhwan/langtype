import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

test('creates a playable custom collection from home', async ({ page }) => {
    const title = `Create e2e collection ${Date.now()}`

    await page.goto('/')
    await expect(page.getByRole('link', { name: /Netzwerk Neu A1.*Kapitel 1:/ })).toBeVisible()
    await page.getByRole('link', { name: 'Create collection' }).click()

    await expect(page.getByRole('heading', { name: 'Custom collection' })).toBeVisible()
    const practice = page.getByRole('link', { name: 'Practice' })
    await expect(practice).toHaveClass(/pointer-events-none/)

    await page.getByLabel('title').fill(title)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByLabel('prompt').fill('Say hello')
    await page.getByLabel('answer').fill('Hallo')

    await expect(page.getByText('1 challenge ready')).toBeVisible()
    await expect(practice).not.toHaveClass(/pointer-events-none/)

    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('button', { name: 'Custom' })).toBeVisible()
    await page.getByRole('button', { name: 'Custom' }).click()

    const collection = page.getByRole('link', { name: `${title} Custom` })
    await expect(collection).toBeVisible()
    await collection.click()

    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: /Practice All/ }).click()
    await expect(page.getByText('Say hello')).toBeVisible()

    const answer = page.getByRole('textbox', { name: 'Translation gap 1' })
    await answer.fill('Hallo')
    await answer.press('Enter')
    await expect(page.getByText(/correct/i)).toBeVisible()
})
