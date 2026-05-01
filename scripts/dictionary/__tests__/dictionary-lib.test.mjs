import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    buildDictionaryArtifacts,
    listUploadObjects,
    loadDotenv,
    normalizeDictionarySearchTerm,
    normalizeRawEntry,
    searchChunkFileName,
    uploadDictionaryArtifacts,
    validateDictionaryArtifacts,
} from '../dictionary-lib.mjs'

const fixture = path.join(process.cwd(), 'test/fixtures/dictionary/de-sample.jsonl')

describe('dictionary artifact tooling', () => {
    it('normalizes German search terms', () => {
        expect(normalizeDictionarySearchTerm('  ÄRGER  ')).toBe('arger')
        expect(normalizeDictionarySearchTerm('Straße')).toBe('strasse')
        expect(normalizeDictionarySearchTerm('große   Arbeit')).toBe('grosse arbeit')
    })

    it('uses filesystem-safe search chunk names', () => {
        expect(searchChunkFileName('ar')).toBe('p6172.json')
        expect(searchChunkFileName('e/')).toBe('p652f.json')
        expect(searchChunkFileName("'n ", 1, 16)).toBe('p276e20-01.json')
        expect(searchChunkFileName('durc', 15, 16)).toBe('p64757263-15.json')
    })

    it('loads dotenv files without overwriting existing environment values', async () => {
        const outDir = await mkdtemp(path.join(tmpdir(), 'langtype-dotenv-'))
        const envFile = path.join(outDir, '.env')
        const previousBucket = process.env.R2_DICTIONARY_BUCKET
        const previousAccount = process.env.R2_ACCOUNT_ID
        try {
            process.env.R2_DICTIONARY_BUCKET = 'existing-bucket'
            delete process.env.R2_ACCOUNT_ID
            await writeFile(envFile, 'R2_DICTIONARY_BUCKET=file-bucket\nR2_ACCOUNT_ID="abc123"\n')

            await expect(loadDotenv(envFile)).resolves.toBe(true)

            expect(process.env.R2_DICTIONARY_BUCKET).toBe('existing-bucket')
            expect(process.env.R2_ACCOUNT_ID).toBe('abc123')
        } finally {
            if (previousBucket === undefined) {
                delete process.env.R2_DICTIONARY_BUCKET
            } else {
                process.env.R2_DICTIONARY_BUCKET = previousBucket
            }
            if (previousAccount === undefined) {
                delete process.env.R2_ACCOUNT_ID
            } else {
                process.env.R2_ACCOUNT_ID = previousAccount
            }
            await rm(outDir, { recursive: true, force: true })
        }
    })

    it('skips pseudo-forms and derives app entry fields', () => {
        const entry = normalizeRawEntry({
            word: 'arbeiten',
            pos: 'verb',
            forms: [
                { form: 'gearbeitet', tags: ['participle', 'past'] },
                { form: 'ignored', tags: ['table-tags'] },
            ],
            senses: [{ glosses: ['to work'] }],
        })

        expect(entry?.forms.map((form) => form.form)).toEqual(['gearbeitet'])
        expect(entry?.details.pastParticiple).toBe('gearbeitet')
    })

    it('drops entries whose senses are only structured form-of references', () => {
        const entry = normalizeRawEntry({
            word: 'isst',
            pos: 'verb',
            forms: [],
            senses: [{
                glosses: ['second/third-person singular present of essen'],
                form_of: [{ word: 'essen' }],
            }],
        })

        expect(entry).toBeNull()
    })

    it('builds and validates prefix search and entry chunks', async () => {
        const outDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-'))
        const source = path.join(outDir, 'source.jsonl')
        try {
            await writeFile(source, `${await readFile(fixture, 'utf8')}{"word":"e/foo","pos":"noun","forms":[],"senses":[{"glosses":["edge case"]}]}\n{"word":"isst","pos":"verb","forms":[],"senses":[{"glosses":["second/third-person singular present of essen"],"form_of":[{"word":"essen"}]}]}\n`)
            const result = await buildDictionaryArtifacts({
                source,
                version: 'v2026-05-01',
                outDir,
                entryBucketCount: 8,
            })

            expect(result.stats.entryCount).toBe(4)
            expect(result.stats.searchRowCount).toBeGreaterThan(3)
            expect(result.stats.searchChunkCount).toBeGreaterThan(0)
            expect(result.manifest.searchIndexPath).toBe('search-index.json')

            const searchIndex = JSON.parse(await readFile(path.join(result.versionDir, 'search-index.json'), 'utf8'))
            const indexedFiles = Object.values(searchIndex).flat()
            const searchFiles = await readdir(path.join(result.versionDir, 'search'))
            expect(indexedFiles.length).toBe(result.stats.searchChunkCount)
            expect(searchFiles.sort()).toEqual(indexedFiles.toSorted())
            for (const file of searchFiles) {
                const rows = JSON.parse(await readFile(path.join(result.versionDir, 'search', file), 'utf8'))
                expect(rows.length).toBeGreaterThan(0)
            }

            const validation = await validateDictionaryArtifacts({
                versionDir: result.versionDir,
                samples: ['arbeiten', 'gearbeitet', 'Arbeit'],
            })
            expect(validation.ok).toBe(true)

            const formRow = await findSearchRow(result.versionDir, 'p676561', 'gearbeitet')
            expect(formRow).toMatchObject({
                term: 'arbeiten',
                matchedTerm: 'gearbeitet',
                normalized: 'gearbeitet',
                lemma: 'arbeiten',
                matchType: 'form',
            })
            const droppedFormOfRow = await findSearchRow(result.versionDir, 'p697373', 'isst')
            expect(droppedFormOfRow).toBeNull()

            const uploadLines = await uploadDictionaryArtifacts({
                versionDir: result.versionDir,
                bucket: 'dictionary-bucket',
                dryRun: true,
                samples: ['arbeiten'],
            })
            expect(uploadLines).toContain('DRY RUN dictionary-bucket/dictionary/v2026-05-01/manifest.json')
        } finally {
            await rm(outDir, { recursive: true, force: true })
        }
    })

    it('keeps multiword forms in entries but excludes them from search by default', async () => {
        const outDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-multiword-'))
        const source = path.join(outDir, 'source.jsonl')
        try {
            await writeFile(source, '{"word":"machen","pos":"verb","forms":[{"form":"habe gemacht","tags":["perfect"]}],"senses":[{"glosses":["to make"]}]}\n')
            const result = await buildDictionaryArtifacts({
                source,
                version: 'v2026-05-01',
                outDir,
                prefixLength: 4,
                entryBucketCount: 8,
            })

            expect(result.stats.searchRowCount).toBe(1)

            const validation = await validateDictionaryArtifacts({
                versionDir: result.versionDir,
                samples: ['machen'],
            })
            expect(validation.ok).toBe(true)
        } finally {
            await rm(outDir, { recursive: true, force: true })
        }
    })

    it('validation catches missing stats, oversized chunks, malformed JSON, and missing samples', async () => {
        const versionDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-invalid-'))
        try {
            await mkdir(path.join(versionDir, 'search'))
            await mkdir(path.join(versionDir, 'entries'))
            await writeFile(path.join(versionDir, 'manifest.json'), '{"searchIndexPath":"search-index.json"}\n')
            await writeFile(path.join(versionDir, 'build-stats.json'), '{}\n')
            await writeFile(path.join(versionDir, 'search-index.json'), '{"ar":["ar.json"]}\n')
            await writeFile(path.join(versionDir, 'search', 'ar.json'), '{')
            await writeFile(path.join(versionDir, 'entries', '0001.json'), '{"entries":{"x":{"lemma":"arbeiten"}}}\n')

            const validation = await validateDictionaryArtifacts({
                versionDir,
                maxChunkBytes: 0,
                samples: ['arbeiten'],
            })

            expect(validation.ok).toBe(false)
            expect(validation.problems).toEqual(expect.arrayContaining([
                'Missing source checksum',
                'search/ar.json exceeds 0 bytes',
                'search/ar.json is malformed JSON',
                'entries/0001.json exceeds 0 bytes',
                'Missing sample lookup: arbeiten',
            ]))
        } finally {
            await rm(versionDir, { recursive: true, force: true })
        }
    })

    it('validation requires a search index', async () => {
        const versionDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-missing-index-'))
        try {
            await mkdir(path.join(versionDir, 'search'))
            await mkdir(path.join(versionDir, 'entries'))
            await writeFile(path.join(versionDir, 'manifest.json'), '{}\n')
            await writeFile(path.join(versionDir, 'build-stats.json'), '{"sourceSha256":"abc"}\n')
            await writeFile(path.join(versionDir, 'entries', '0001.json'), '{"entries":{}}\n')

            const validation = await validateDictionaryArtifacts({ versionDir })

            expect(validation.ok).toBe(false)
            expect(validation.problems).toContain('Missing search-index.json')
        } finally {
            await rm(versionDir, { recursive: true, force: true })
        }
    })

    it('validation catches bad search index references and stray search files', async () => {
        const versionDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-bad-index-'))
        try {
            await mkdir(path.join(versionDir, 'search'))
            await mkdir(path.join(versionDir, 'entries'))
            await writeFile(path.join(versionDir, 'manifest.json'), '{"searchIndexPath":"search-index.json"}\n')
            await writeFile(path.join(versionDir, 'build-stats.json'), '{"sourceSha256":"abc"}\n')
            await writeFile(path.join(versionDir, 'search-index.json'), '{"p6172":["missing.json","empty.json","bad.json"]}\n')
            await writeFile(path.join(versionDir, 'search', 'empty.json'), '[]\n')
            await writeFile(path.join(versionDir, 'search', 'bad.json'), '{}\n')
            await writeFile(path.join(versionDir, 'search', 'stray.json'), '[{"normalized":"arb"}]\n')
            await writeFile(path.join(versionDir, 'entries', '0001.json'), '{"entries":{}}\n')

            const validation = await validateDictionaryArtifacts({ versionDir })

            expect(validation.ok).toBe(false)
            expect(validation.problems).toEqual(expect.arrayContaining([
                'search/missing.json is listed in search-index.json but missing',
                'search/empty.json must not be empty',
                'search/bad.json must be an array',
                'search/stray.json is not listed in search-index.json',
            ]))
        } finally {
            await rm(versionDir, { recursive: true, force: true })
        }
    })

    it('lists upload keys with cache metadata', async () => {
        const outDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-upload-'))
        try {
            const result = await buildDictionaryArtifacts({
                source: fixture,
                version: 'v2026-05-01',
                outDir,
                entryBucketCount: 8,
            })
            const objects = await listUploadObjects(result.versionDir)
            expect(objects.some((object) => object.key === 'dictionary/v2026-05-01/manifest.json')).toBe(true)
            expect(objects.every((object) => object.contentType === 'application/json; charset=utf-8')).toBe(true)
        } finally {
            await rm(outDir, { recursive: true, force: true })
        }
    })

    it('uploads with signed R2 S3 API requests', async () => {
        const outDir = await mkdtemp(path.join(tmpdir(), 'langtype-dict-r2-'))
        try {
            const result = await buildDictionaryArtifacts({
                source: fixture,
                version: 'v2026-05-01',
                outDir,
                entryBucketCount: 8,
            })
            const calls = []
            const fetcher = async (url, init) => {
                calls.push({ url: String(url), init })
                return {
                    ok: init.method === 'HEAD' ? false : true,
                    status: init.method === 'HEAD' ? 404 : 200,
                    text: async () => '',
                }
            }

            const uploadLines = await uploadDictionaryArtifacts({
                versionDir: result.versionDir,
                bucket: 'dictionary-bucket',
                accountId: 'abc123',
                accessKeyId: 'access-key',
                secretAccessKey: 'secret-key',
                fetcher,
                uploadConcurrency: 4,
            })

            expect(calls[0].init.method).toBe('HEAD')
            expect(calls[0].url).toBe('https://abc123.r2.cloudflarestorage.com/dictionary-bucket/dictionary/v2026-05-01/manifest.json')
            expect(calls.some((call) => call.init.method === 'PUT')).toBe(true)
            expect(calls.at(-1).init.headers.authorization).toContain('AWS4-HMAC-SHA256 Credential=access-key/')
            expect(uploadLines.some((line) => line.includes('/manifest.json'))).toBe(true)
        } finally {
            await rm(outDir, { recursive: true, force: true })
        }
    })
})

async function findSearchRow(versionDir, encodedPrefix, normalized) {
    const searchDir = path.join(versionDir, 'search')
    const files = await readdir(searchDir)
    for (const file of files.filter((name) => name.startsWith(encodedPrefix))) {
        const rows = JSON.parse(await readFile(path.join(searchDir, file), 'utf8'))
        const row = rows.find((item) => item.normalized === normalized)
        if (row) return row
    }
    return null
}
