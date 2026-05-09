import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const COLLECTION_TITLE = /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/

async function expectReachableInViewport(page: Page, locator: Locator) {
    await expect(locator).toBeVisible()

    const box = await locator.boundingBox()
    expect(box).not.toBeNull()

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()

    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
        Math.random = () => 0.999999
    })
})

test('starts on the homepage and completes one practice challenge', async ({ page }) => {
    await page.goto('/')

    const collection = page.getByRole('link', { name: COLLECTION_TITLE })
    await expect(collection).toBeVisible()
    await collection.click()

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()

    const practiceAll = page.getByRole('button', { name: /Practice All/ })
    await expect(practiceAll).toBeVisible()
    await practiceAll.click()

    await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
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

test.describe('mobile practice smoke', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })

    test('navigates from home and completes one practice challenge with controls reachable', async ({ page }) => {
        await page.goto('/')

        const collection = page.getByRole('link', { name: COLLECTION_TITLE })
        await expectReachableInViewport(page, collection)
        await collection.click()

        await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()

        const practiceAll = page.getByRole('button', { name: /Practice All/ })
        await expectReachableInViewport(page, practiceAll)
        await practiceAll.click()

        await expect(page.getByRole('heading', { name: COLLECTION_TITLE })).toBeVisible()
        await expect(page.getByText('Name', { exact: true })).toBeVisible()

        const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
        const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })
        await expectReachableInViewport(page, articleGap)
        await expectReachableInViewport(page, pluralGap)

        await articleGap.fill('der')
        await articleGap.press('Enter')
        await pluralGap.fill('Namen')
        await pluralGap.press('Enter')

        await expect(page.getByText(/correct/i)).toBeVisible()
        await expectReachableInViewport(page, page.getByRole('button', { name: 'Back' }))
    })
})
