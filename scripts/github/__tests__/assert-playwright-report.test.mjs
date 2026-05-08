import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertPlaywrightReport, collectPlaywrightTests } from '../assert-playwright-report.mjs'

let tempDir

describe('Playwright report assertion', () => {
    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'langtype-playwright-report-'))
    })

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true })
    })

    it('accepts expected and skipped tests', async () => {
        const reportPath = await writeReport({
            status: 'passed',
            suites: [{
                title: 'chromium',
                specs: [
                    { title: 'loads app', tests: [{ outcome: 'expected' }] },
                    { title: 'skips setup-only case', tests: [{ status: 'skipped' }] },
                ],
            }],
        })

        await expect(assertPlaywrightReport(reportPath)).resolves.toEqual({
            total: 2,
            skipped: 1,
        })
    })

    it('fails when a report contains unexpected tests even if report status says passed', async () => {
        const reportPath = await writeReport({
            status: 'passed',
            suites: [{
                title: 'chromium',
                specs: [
                    { title: 'submits answer', tests: [{ outcome: 'unexpected' }] },
                    { title: 'recovers on retry', tests: [{ outcome: 'flaky' }] },
                ],
            }],
        })

        await expect(assertPlaywrightReport(reportPath)).rejects.toThrow(
            'Playwright report contains 2 non-passing test result(s):'
        )
        await expect(assertPlaywrightReport(reportPath)).rejects.toThrow('chromium > submits answer: unexpected')
        await expect(assertPlaywrightReport(reportPath)).rejects.toThrow('chromium > recovers on retry: flaky')
    })

    it('fails when the overall report status is not passed', async () => {
        const reportPath = await writeReport({
            status: 'failed',
            suites: [{
                title: 'chromium',
                specs: [{ title: 'loads app', tests: [{ outcome: 'expected' }] }],
            }],
        })

        await expect(assertPlaywrightReport(reportPath)).rejects.toThrow('Playwright report status is failed.')
    })

    it('collects nested suite test titles', () => {
        expect(collectPlaywrightTests({
            suites: [{
                title: 'chromium',
                suites: [{
                    title: 'free-input.spec.ts',
                    specs: [{ title: 'submits answer', tests: [{ status: 'timedOut' }] }],
                }],
            }],
        })).toEqual([{
            title: 'chromium > free-input.spec.ts > submits answer',
            status: 'timedOut',
        }])
    })
})

async function writeReport(report) {
    const reportDir = path.join(tempDir, 'reports', 'playwright')
    const reportPath = path.join(reportDir, 'results.json')
    await mkdir(reportDir, { recursive: true })
    await writeFile(reportPath, JSON.stringify(report))
    return reportPath
}
