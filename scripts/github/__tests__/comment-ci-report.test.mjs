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
})
