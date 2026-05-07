import { test, expect } from '@playwright/test'

// Challenge 4 in dev_test: "der (Kellner)" — one gap input ("der") + one pre-filled span (" Kellner")
// Perfect for checking that the two element types sit on the same baseline.
const FREE_INPUT_URL = '/collections/dev_test?mode=normal&questionId=4'
const MULTI_GAP_FREE_INPUT_URL = '/collections/dev_test?mode=normal&questionId=7'

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
    ).toHaveScreenshot('free-input.png', { maxDiffPixels: 400 })
})

test('fills multiple free-input gaps around pre-filled text with keyboard input', async ({ page }) => {
    await page.goto(MULTI_GAP_FREE_INPUT_URL)

    const input = page.getByTestId('visual-translation-input')
    await expect(input).toContainText('Krankenschwester')
    await expect(input).toContainText('die')
    await expect(input.locator('span').filter({ hasText: 'Krankenschwester' })).toBeVisible()

    const gaps = page.getByTestId('translation-gap')
    await expect(gaps).toHaveCount(2)
    await expect(gaps.nth(0)).toHaveAccessibleName('Translation gap 1')
    await expect(gaps.nth(1)).toHaveAccessibleName('Translation gap 2')

    await expect(input.getByRole('textbox')).toHaveCount(2)

    await gaps.nth(0).click()
    await page.keyboard.type('die')
    await page.keyboard.press('Enter')
    await expect(gaps.nth(1)).toBeFocused()

    await page.keyboard.type('Krankenschwestern')
    await page.keyboard.press('Enter')

    await expect(page.getByText(/correct/i)).toBeVisible()
    await expect(gaps.nth(0)).toHaveAttribute('data-gap-state', 'correct')
    await expect(gaps.nth(1)).toHaveAttribute('data-gap-state', 'correct')
})
