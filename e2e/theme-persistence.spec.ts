import { expect, test } from '@playwright/test'

test('persists the selected theme across reloads', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lt_theme'))).toBe('warm')

    const darkModeToggle = page.getByRole('button', { name: 'Switch to dark mode' })
    await expect(darkModeToggle).toBeVisible()
    await darkModeToggle.click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lt_theme'))).toBe('ink')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ink')
    const lightModeToggle = page.getByRole('button', { name: 'Switch to light mode' })
    await expect(lightModeToggle).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lt_theme'))).toBe('ink')

    await lightModeToggle.click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lt_theme'))).toBe('warm')
})
