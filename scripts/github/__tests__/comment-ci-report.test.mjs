import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildComment } from '../comment-ci-report.mjs'

const originalCwd = process.cwd()
let tempDir

describe('CI report comment', () => {
    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'langtype-ci-report-'))
        process.chdir(tempDir)
        process.env.LINT_OUTCOME = 'success'
        process.env.UNIT_OUTCOME = 'success'
        process.env.COVERAGE_OUTCOME = 'failure'
        process.env.BUILD_OUTCOME = 'success'
        process.env.E2E_OUTCOME = 'success'

        await mkdir('coverage', { recursive: true })
        await writeFile('coverage/coverage-summary.json', JSON.stringify({
            total: {
                lines: { pct: 91 },
                statements: { pct: 92 },
                functions: { pct: 93 },
                branches: { pct: 81 },
            },
            '/repo/src/example.ts': {
                lines: { pct: 91 },
                statements: { pct: 92 },
                functions: { pct: 93 },
                branches: { pct: 81 },
            },
        }))
    })

    afterEach(async () => {
        process.chdir(originalCwd)
        delete process.env.LINT_OUTCOME
        delete process.env.UNIT_OUTCOME
        delete process.env.COVERAGE_OUTCOME
        delete process.env.BUILD_OUTCOME
        delete process.env.E2E_OUTCOME
        await rm(tempDir, { recursive: true, force: true })
    })

    it('shows coverage thresholds and threshold failure guidance', () => {
        const comment = buildComment({
            serverUrl: 'https://github.com',
            repository: 'owner/repo',
            runId: '123',
        })

        expect(comment).toContain('| Coverage | fail | failed job may be from tests or threshold enforcement; see artifacts for details; see coverage tables below |')
        expect(comment).toContain('| Metric | Total | Threshold |')
        expect(comment).toContain('| Lines | 91.00% | 90% |')
        expect(comment).toContain('| Statements | 92.00% | 90% |')
        expect(comment).toContain('| Functions | 93.00% | 90% |')
        expect(comment).toContain('| Branches | 81.00% | 80% |')
        expect(comment).toContain('failed job may be from tests or threshold enforcement')
    })

    it('uses fallback summaries when reports are missing', async () => {
        await rm('coverage', { recursive: true, force: true })

        const comment = buildComment(context())

        expect(comment).toContain('| Unit/component tests | pass | No JUnit report found. |')
        expect(comment).toContain('| Coverage | fail | No coverage summary found.; failed job may be from tests or threshold enforcement; see artifacts for details |')
        expect(comment).toContain('| End-to-end tests | pass | No Playwright JSON report found. |')
    })

    it('summarizes and lists Vitest JUnit failures and errors', async () => {
        await mkdir('reports/vitest', { recursive: true })
        await writeFile('reports/vitest/junit.xml', [
            '<testsuites>',
            '<testsuite tests="3" failures="1" errors="1" skipped="1">',
            '<testcase name="fails" classname="alpha suite"><failure /></testcase>',
            '<testcase name="errors" classname="beta suite"><error /></testcase>',
            '<testcase classname="gamma suite" name="skips"><skipped /></testcase>',
            '</testsuite>',
            '</testsuites>',
        ].join(''))

        const comment = buildComment(context())

        expect(comment).toContain('| Unit/component tests | pass | 3 tests, 2 failed, 1 skipped |')
        expect(comment).toContain('<details><summary>Vitest failures</summary>')
        expect(comment).toContain('- alpha suite - fails')
        expect(comment).toContain('- beta suite - errors')
    })

    it('uses fallback messaging when coverage totals are missing', async () => {
        await writeFile('coverage/coverage-summary.json', JSON.stringify({
            'src/example.ts': {
                lines: { pct: 91 },
            },
        }))

        const comment = buildComment(context())

        expect(comment).toContain('| Coverage | fail | Coverage summary did not include totals.; failed job may be from tests or threshold enforcement; see artifacts for details |')
        expect(comment).not.toContain('### Coverage totals')
    })

    it('summarizes Playwright failures and skipped tests', async () => {
        await mkdir('reports/playwright', { recursive: true })
        await writeFile('reports/playwright/results.json', JSON.stringify({
            suites: [{
                title: 'chromium',
                specs: [
                    { title: 'loads app', tests: [{ outcome: 'expected' }] },
                    { title: 'submits answer', tests: [{ outcome: 'unexpected' }] },
                    { title: 'exports data', tests: [{ status: 'skipped' }] },
                ],
                suites: [{
                    title: 'nested',
                    specs: [{ title: 'times out', tests: [{ status: 'timedOut' }] }],
                }],
            }],
        }))

        const comment = buildComment(context())

        expect(comment).toContain('| End-to-end tests | pass | 4 tests, 2 failed, 1 skipped |')
        expect(comment).toContain('<details><summary>Playwright failures</summary>')
        expect(comment).toContain('- chromium > submits answer')
        expect(comment).toContain('- chromium > nested > times out')
    })

    it('escapes markdown table cells', async () => {
        await writeFile('coverage/coverage-summary.json', JSON.stringify({
            total: {
                lines: { pct: 91 },
                statements: { pct: 92 },
                functions: { pct: 93 },
                branches: { pct: 81 },
            },
            [`${process.cwd()}/src/file|with\nnewline.ts`]: {
                lines: { pct: 91 },
                statements: { pct: 92 },
                functions: { pct: 93 },
                branches: { pct: 81 },
            },
        }))

        const comment = buildComment(context())

        expect(comment).toContain('src/file\\|with<br>newline.ts')
    })

    it('renders all check outcomes', () => {
        process.env.LINT_OUTCOME = 'success'
        process.env.UNIT_OUTCOME = 'failure'
        process.env.COVERAGE_OUTCOME = 'cancelled'
        process.env.BUILD_OUTCOME = 'skipped'
        delete process.env.E2E_OUTCOME

        const comment = buildComment(context())

        expect(comment).toContain('| Lint | pass | `npm run lint` |')
        expect(comment).toContain('| Unit/component tests | fail | No JUnit report found. |')
        expect(comment).toContain('| Coverage | cancelled | see coverage tables below |')
        expect(comment).toContain('| Production build | skipped | `npm run build` |')
        expect(comment).toContain('| End-to-end tests | not run | No Playwright JSON report found. |')
    })
})

function context() {
    return {
        serverUrl: 'https://github.com',
        repository: 'owner/repo',
        runId: '123',
    }
}
