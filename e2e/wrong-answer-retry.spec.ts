import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const NORMAL_RETRY_URL = '/collections/netzwerk_neu_a1_k1_nomen_plural?mode=normal'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')

        let calls = 0
        Math.random = () => {
            calls += 1
            return calls <= 25 ? 0.999999 : 0
        }
    })
})

async function answerCurrentCard(page: Page, article: string, plural: string) {
    const articleGap = page.getByRole('textbox', { name: 'Translation gap 1' })
    const pluralGap = page.getByRole('textbox', { name: 'Translation gap 2' })

    await expect(articleGap).toBeVisible()
    await articleGap.fill(article)
    await expect(articleGap).toHaveValue(article)
    await articleGap.press('Enter')
    await expect(pluralGap).toBeFocused()
    await pluralGap.fill(plural)
    await expect(pluralGap).toHaveValue(plural)
    await pluralGap.press('Enter')
}

test('wrong answer in normal mode keeps the session alive and retries the card', async ({ page }) => {
    await page.goto(NORMAL_RETRY_URL)

    await expect(page.getByText('First Name', { exact: true })).toBeVisible()

    await answerCurrentCard(page, 'wrong', 'wrong')

    await expect(page.getByText(/incorrect/i)).toBeVisible()
    await expect(page.getByText('Correct: der Vorname, die Vornamen')).toBeVisible()

    await expect(page.getByText('Last Name', { exact: true })).toBeVisible({ timeout: 7000 })
    await expect(page.getByRole('heading', { name: /Netzwerk Neu A1.*Kapitel 1: Artikel \+ Plural/ })).toBeVisible()

    await answerCurrentCard(page, 'der', 'Nachnamen')
    await expect(page.getByText(/correct/i)).toBeVisible()

    await expect(page.getByText('First Name', { exact: true })).toBeVisible({ timeout: 7000 })

    await answerCurrentCard(page, 'der', 'Vornamen')

    await expect(page.getByText(/correct/i)).toBeVisible()
})
