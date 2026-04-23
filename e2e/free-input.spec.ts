import { test, expect } from '@playwright/test'

// Challenge 4 in dev_test: "der (Kellner)" — one gap input ("der") + one pre-filled span (" Kellner")
// Perfect for checking that the two element types sit on the same baseline.
const FREE_INPUT_URL = '/collections/dev_test?mode=normal&questionId=4'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
    await page.goto(FREE_INPUT_URL)
    await page.waitForSelector('[data-testid="visual-translation-input"]')
    await page.evaluate(() => document.fonts.ready)
})

test('gap input top edge aligns with pre-filled span top edge', async ({ page }) => {
    const input = page.locator('[data-testid="visual-translation-input"] input').first()
    const span = page.locator('[data-testid="visual-translation-input"] span').first()

    const inputBox = await input.boundingBox()
    const spanBox = await span.boundingBox()

    expect(inputBox).not.toBeNull()
    expect(spanBox).not.toBeNull()
    // Allow 2px tolerance for sub-pixel rendering differences
    expect(Math.abs(inputBox!.y - spanBox!.y)).toBeLessThan(2)
})

test('free input renders correctly', async ({ page }) => {
    await expect(
        page.locator('[data-testid="visual-translation-input"]')
    ).toHaveScreenshot('free-input.png')
})
