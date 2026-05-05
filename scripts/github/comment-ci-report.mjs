import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const MARKER = '<!-- langtype-ci-report -->'
const MAX_FAILURES = 10
const ARTIFACTS_DIR = process.env.CI_ARTIFACTS_DIR ?? 'artifacts'
const COVERAGE_THRESHOLDS = {
    lines: 90,
    statements: 90,
    functions: 90,
    branches: 80,
}

const env = process.env

if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch((error) => {
        console.error(error)
        process.exit(1)
    })
}

async function main() {
    const context = getContext()
    const body = buildComment(context)
    const comments = await githubRequest(context, `/repos/${context.repository}/issues/${context.issueNumber}/comments`)
    const existing = comments.find((comment) => {
        return comment.user?.type === 'Bot' && comment.body?.includes(MARKER)
    })

    if (existing) {
        await githubRequest(context, `/repos/${context.repository}/issues/comments/${existing.id}`, {
            method: 'PATCH',
            body: { body },
        })
        return
    }

    await githubRequest(context, `/repos/${context.repository}/issues/${context.issueNumber}/comments`, {
        method: 'POST',
        body: { body },
    })
}

function getContext() {
    const event = JSON.parse(readText(env.GITHUB_EVENT_PATH))
    const issueNumber = event.pull_request?.number

    if (!issueNumber) {
        throw new Error('PR Quality Gate report comments require a pull_request event payload.')
    }

    return {
        apiUrl: env.GITHUB_API_URL ?? 'https://api.github.com',
        repository: requiredEnv('GITHUB_REPOSITORY'),
        runId: requiredEnv('GITHUB_RUN_ID'),
        serverUrl: env.GITHUB_SERVER_URL ?? 'https://github.com',
        token: requiredEnv('GITHUB_TOKEN'),
        issueNumber,
    }
}

export function buildComment(context) {
    const vitest = parseVitest()
    const coverage = parseCoverage()
    const playwright = parsePlaywright()
    const runUrl = `${context.serverUrl}/${context.repository}/actions/runs/${context.runId}`
    const coverageDetails = coverage.totals
        ? [
            coverageFailureNote(),
            'see coverage tables below',
        ].filter(Boolean).join('; ')
        : [
            coverage.summary,
            coverageFailureNote(),
        ].filter(Boolean).join('; ')
    const lines = [
        MARKER,
        '## PR Quality Gate report',
        '',
        '| Check | Result | Details |',
        '| --- | --- | --- |',
        `| Lint | ${formatOutcome(env.LINT_OUTCOME)} | \`npm run lint\` |`,
        `| Unit/component tests | ${formatOutcome(env.UNIT_OUTCOME)} | ${escapeCell(vitest.summary)} |`,
        `| Coverage | ${formatOutcome(env.COVERAGE_OUTCOME)} | ${escapeCell(coverageDetails)} |`,
        `| Production build | ${formatOutcome(env.BUILD_OUTCOME)} | \`npm run build\` |`,
        `| End-to-end tests | ${formatOutcome(env.E2E_OUTCOME)} | ${escapeCell(playwright.summary)} |`,
        '',
        `[Workflow run and artifacts](${runUrl})`,
    ]

    addCoverageTable(lines, coverage)
    addFailures(lines, 'Vitest failures', vitest.failures)
    addFailures(lines, 'Playwright failures', playwright.failures)

    return lines.join('\n')
}

function parseVitest() {
    const xml = readFirstText([
        'reports/vitest/junit.xml',
        `${ARTIFACTS_DIR}/vitest-junit-report/junit.xml`,
    ])

    if (!xml) {
        return { summary: 'No JUnit report found.', failures: [] }
    }

    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)].map((match) => match[1])
    const totals = suites.reduce((acc, attrs) => {
        for (const key of ['tests', 'failures', 'errors', 'skipped']) {
            acc[key] += readNumericAttribute(attrs, key)
        }

        return acc
    }, { tests: 0, failures: 0, errors: 0, skipped: 0 })
    const failures = [...xml.matchAll(/<testcase\b([^>]*)>[\s\S]*?<(failure|error)\b/g)]
        .slice(0, MAX_FAILURES)
        .map((match) => {
            const attrs = match[1]
            const classname = readStringAttribute(attrs, 'classname') ?? 'unknown suite'
            const name = readStringAttribute(attrs, 'name') ?? 'unknown test'
            return `${classname} - ${name}`
        })

    return {
        summary: `${totals.tests} tests, ${totals.failures + totals.errors} failed, ${totals.skipped} skipped`,
        failures,
    }
}

function parseCoverage() {
    const raw = readFirstText([
        'coverage/coverage-summary.json',
        `${ARTIFACTS_DIR}/vitest-coverage-report/coverage-summary.json`,
    ])

    if (!raw) {
        return { summary: 'No coverage summary found.', rows: [] }
    }

    const report = JSON.parse(raw)
    const { total } = report

    if (!total) {
        return { summary: 'Coverage summary did not include totals.', rows: [] }
    }

    return {
        summary: 'Coverage totals and thresholds reported below.',
        totals: formatCoverageTotals(total),
        rows: buildCoverageRows(report),
    }
}

function parsePlaywright() {
    const raw = readFirstText([
        'reports/playwright/results.json',
        `${ARTIFACTS_DIR}/playwright-json-report/results.json`,
    ])

    if (!raw) {
        return { summary: 'No Playwright JSON report found.', failures: [] }
    }

    const report = JSON.parse(raw)
    const tests = collectPlaywrightTests(report)
    const failed = tests.filter((test) => test.status !== 'expected' && test.status !== 'skipped')
    const skipped = tests.filter((test) => test.status === 'skipped').length

    return {
        summary: `${tests.length} tests, ${failed.length} failed, ${skipped} skipped`,
        failures: failed.slice(0, MAX_FAILURES).map((test) => test.title),
    }
}

function collectPlaywrightTests(report) {
    const tests = []

    for (const suite of report.suites ?? []) {
        visitPlaywrightSuite(suite, [suite.title].filter(Boolean), tests)
    }

    return tests
}

function visitPlaywrightSuite(suite, parents, tests) {
    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
            tests.push({
                title: [...parents, spec.title].filter(Boolean).join(' > '),
                status: test.outcome ?? test.status ?? 'unknown',
            })
        }
    }

    for (const child of suite.suites ?? []) {
        visitPlaywrightSuite(child, [...parents, child.title].filter(Boolean), tests)
    }
}

async function githubRequest(context, path, options = {}) {
    const response = await fetch(`${context.apiUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${context.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
        throw new Error(`GitHub API ${response.status}: ${await response.text()}`)
    }

    return response.status === 204 ? null : response.json()
}

function addFailures(lines, title, failures) {
    if (failures.length === 0) return

    lines.push('', `<details><summary>${title}</summary>`, '')
    lines.push(...failures.map((failure) => `- ${failure}`))
    lines.push('', '</details>')
}

function addCoverageTable(lines, coverage) {
    if (!coverage.totals || coverage.rows.length === 0) return

    lines.push(
        '',
        '### Coverage totals',
        '',
        '| Metric | Total | Threshold |',
        '| --- | ---: | ---: |',
    )
    lines.push(...coverage.totals.map((row) => {
        return `| ${row.metric} | ${row.total} | ${row.threshold} |`
    }))

    lines.push(
        '',
        '<details open><summary>Coverage by file</summary>',
        '',
        '| File | Statements | Branches | Functions | Lines |',
        '| --- | ---: | ---: | ---: | ---: |',
    )
    lines.push(...coverage.rows.map((row) => {
        return `| ${escapeCell(row.file)} | ${row.statements} | ${row.branches} | ${row.functions} | ${row.lines} |`
    }))
    lines.push('', '</details>')
}

function buildCoverageRows(report) {
    const rows = Object.entries(report)
        .map(([file, metrics]) => ({ file, metrics }))
        .filter(({ file }) => file !== 'total')
        .sort((left, right) => left.file.localeCompare(right.file))
        .map(({ file, metrics }) => formatCoverageRow(file, metrics))

    return [
        formatCoverageRow('Total', report.total),
        ...rows,
    ]
}

function formatCoverageRow(file, metrics) {
    return {
        file: normalizeCoveragePath(file),
        statements: formatPercent(metrics.statements?.pct),
        branches: formatPercent(metrics.branches?.pct),
        functions: formatPercent(metrics.functions?.pct),
        lines: formatPercent(metrics.lines?.pct),
    }
}

function formatCoverageTotals(total) {
    return [
        { metric: 'Lines', total: formatPercent(total.lines?.pct), threshold: formatThreshold('lines') },
        { metric: 'Statements', total: formatPercent(total.statements?.pct), threshold: formatThreshold('statements') },
        { metric: 'Functions', total: formatPercent(total.functions?.pct), threshold: formatThreshold('functions') },
        { metric: 'Branches', total: formatPercent(total.branches?.pct), threshold: formatThreshold('branches') },
    ]
}

function formatThreshold(metric) {
    return `${COVERAGE_THRESHOLDS[metric]}%`
}

function coverageFailureNote() {
    if (env.COVERAGE_OUTCOME !== 'failure') return ''
    return 'failed job may be from tests or threshold enforcement; see artifacts for details'
}

function formatOutcome(outcome) {
    if (outcome === 'success') return 'pass'
    if (outcome === 'failure') return 'fail'
    if (outcome === 'cancelled') return 'cancelled'
    if (outcome === 'skipped') return 'skipped'
    return 'not run'
}

function formatPercent(value) {
    return typeof value === 'number' ? `${value.toFixed(2)}%` : 'n/a'
}

function normalizeCoveragePath(file) {
    return file.replace(`${process.cwd()}/`, '')
}

function escapeCell(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function readText(path) {
    if (!path || !fs.existsSync(path)) return ''
    return fs.readFileSync(path, 'utf8')
}

function readFirstText(paths) {
    for (const path of paths) {
        const text = readText(path)
        if (text) return text
    }

    return ''
}

function readNumericAttribute(attrs, name) {
    const value = attrs.match(new RegExp(`${name}="(\\d+)"`))
    return value ? Number(value[1]) : 0
}

function readStringAttribute(attrs, name) {
    return attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1]
}

function requiredEnv(name) {
    const value = env[name]

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}
