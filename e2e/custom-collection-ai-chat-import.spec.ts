import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => {
        localStorage.setItem('lt_theme', 'warm')
    })
})

test('copies the AI chat import prompt to the clipboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Create collection' }).click()

    await page.getByRole('button', { name: 'Import from AI chat' }).click()
    await page.getByRole('textbox', { name: 'request', exact: true }).fill('Practice restaurant phrases')
    await page.getByRole('spinbutton', { name: 'count', exact: true }).fill('7')
    await page.getByRole('textbox', { name: 'level/style', exact: true }).fill('A2 casual')

    await page.getByRole('button', { name: 'Copy prompt' }).click()

    await expect(page.locator('span').filter({ hasText: /^Copied$/ })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'copy prompt', exact: true })).toHaveValue(/Create 7 German translation typing challenges\./)
    await expect(page.getByRole('textbox', { name: 'copy prompt', exact: true })).toHaveValue(/User request: Practice restaurant phrases/)
    await expect(page.getByRole('textbox', { name: 'copy prompt', exact: true })).toHaveValue(/Level\/style: A2 casual/)

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('Create 7 German translation typing challenges.')
    expect(clipboardText).toContain('Return only one JSON code block and no explanation.')
    expect(clipboardText).toContain('"kind":"prefill"')
    expect(clipboardText).toContain('"kind":"type"')
})

test('imports valid AI chat segments and plays the custom collection', async ({ page }) => {
    const title = `AI import e2e collection ${Date.now()}`
    const importJson = JSON.stringify([
        {
            original: 'Say good morning.',
            segments: [
                { kind: 'prefill', text: 'Guten ' },
                { kind: 'type', text: 'Morgen' },
            ],
        },
        {
            original: 'Only a hint is not playable.',
            segments: [{ kind: 'prefill', text: 'Nur Hinweis' }],
        },
    ])

    await page.goto('/')
    await page.getByRole('link', { name: 'Create collection' }).click()

    await expect(page.getByRole('heading', { name: 'Custom collection' })).toBeVisible()
    await page.getByLabel('title').fill(title)
    await page.getByRole('button', { name: 'Import from AI chat' }).click()
    await page.getByLabel('paste JSON code block content').fill(importJson)

    await expect(page.getByText('1 valid, 1 skipped')).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Say good morning\.$/ })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^\(Guten \)Morgen$/ })).toBeVisible()

    await page.getByRole('button', { name: 'Insert 1 challenges' }).click()

    await expect(page.getByText('1 challenge ready')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'prompt', exact: true })).toHaveValue('Say good morning.')
    await expect(page.getByRole('textbox', { name: 'answer', exact: true })).toHaveValue('(Guten )Morgen')

    await page.getByRole('link', { name: 'Practice' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: /Practice All/ }).click()

    await expect(page.getByText('Say good morning.')).toBeVisible()
    const answer = page.getByRole('textbox', { name: 'Translation gap 1' })
    await answer.fill('Morgen')
    await answer.press('Enter')
    await expect(page.getByText(/correct/i)).toBeVisible()
})
