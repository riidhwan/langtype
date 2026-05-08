import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const PASSING_STATUSES = new Set(['expected', 'skipped'])

export async function assertPlaywrightReport(reportPath) {
    const raw = await readFile(reportPath, 'utf8')
    const report = JSON.parse(raw)
    const tests = collectPlaywrightTests(report)
    const failed = tests.filter((test) => !PASSING_STATUSES.has(test.status))

    if (failed.length > 0) {
        throw new Error([
            `Playwright report contains ${failed.length} non-passing test result(s):`,
            ...failed.map((test) => `- ${test.title}: ${test.status}`),
        ].join('\n'))
    }

    if (report.status && report.status !== 'passed') {
        throw new Error(`Playwright report status is ${report.status}.`)
    }

    return {
        total: tests.length,
        skipped: tests.filter((test) => test.status === 'skipped').length,
    }
}

export function collectPlaywrightTests(report) {
    const tests = []

    for (const suite of report.suites ?? []) {
        visitSuite(suite, [suite.title].filter(Boolean), tests)
    }

    return tests
}

function visitSuite(suite, parents, tests) {
    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
            tests.push({
                title: [...parents, spec.title].filter(Boolean).join(' > '),
                status: test.outcome ?? test.status ?? 'unknown',
            })
        }
    }

    for (const child of suite.suites ?? []) {
        visitSuite(child, [...parents, child.title].filter(Boolean), tests)
    }
}

async function main() {
    const reportPath = process.argv[2] ?? 'reports/playwright/results.json'
    const result = await assertPlaywrightReport(reportPath)
    console.log(`Playwright report passed: ${result.total} test(s), ${result.skipped} skipped.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
}
