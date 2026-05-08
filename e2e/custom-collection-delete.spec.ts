import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

test('deleting a custom collection removes it from home and practice access', async ({ page }) => {
    const title = `Delete e2e collection ${Date.now()}`

    await page.goto('/')
    await page.getByRole('link', { name: 'Create collection' }).click()

    await expect(page.getByRole('heading', { name: 'Custom collection' })).toBeVisible()
    const collectionId = new URL(page.url()).pathname.match(/\/custom-collections\/([^/]+)\/edit/)?.[1]
    expect(collectionId).toMatch(/^custom_/)

    await page.getByLabel('title').fill(title)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByLabel('answer').fill('Hallo')
    await expect(page.getByText('1 challenge ready')).toBeVisible()

    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('button', { name: 'Custom' }).click()
    await expect(page.getByRole('link', { name: `${title} Custom` })).toBeVisible()

    await page.getByTitle('Edit collection').click()
    page.once('dialog', async (dialog) => {
        expect(dialog.message()).toBe('Delete this custom collection and its progress?')
        await dialog.accept()
    })
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Netzwerk Neu', exact: true }).click()
    await expect(page.getByRole('link', { name: `${title} Custom` })).toHaveCount(0)

    await page.goto(`/collections/${collectionId}`)
    await expect(page.getByRole('heading', { name: 'Collection not found' })).toBeVisible()
    await expect(page.getByText('This custom collection is not saved or is not playable on this device.')).toBeVisible()
})
