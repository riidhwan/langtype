import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

test('edited custom collection content is used in practice', async ({ page }) => {
    const originalTitle = `Edit e2e collection ${Date.now()}`
    const updatedTitle = `${originalTitle} updated`

    await page.goto('/')
    await page.getByRole('link', { name: 'Create collection' }).click()

    await expect(page.getByRole('heading', { name: 'Custom collection' })).toBeVisible()
    await page.getByLabel('title').fill(originalTitle)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByLabel('prompt').fill('Translate the edited greeting')
    await page.getByLabel('answer').fill('Hallo')
    await expect(page.getByText('1 challenge ready')).toBeVisible()

    await page.getByLabel('title').fill(updatedTitle)
    await page.getByLabel('prompt').fill('Translate the updated farewell')
    await page.getByLabel('answer').fill('Danke')

    await page.getByRole('link', { name: 'Practice' }).click()

    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
    await page.getByRole('button', { name: /Practice All/ }).click()
    await expect(page.getByText('Translate the updated farewell')).toBeVisible()
    await expect(page.getByText('Translate the edited greeting')).toHaveCount(0)

    const answer = page.getByRole('textbox', { name: 'Translation gap 1' })
    await answer.fill('Danke')
    await answer.press('Enter')
    await expect(page.getByText(/correct/i)).toBeVisible()
})
