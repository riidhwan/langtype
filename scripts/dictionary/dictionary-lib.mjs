import { createHash, createHmac } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { URL } from 'node:url'

export const SCRIPT_VERSION = '1'
export const DEFAULT_PREFIX_LENGTH = 3
export const DEFAULT_ENTRY_BUCKET_COUNT = 4096
export const DEFAULT_SEARCH_SHARD_COUNT = 16
export const DEFAULT_UPLOAD_CONCURRENCY = 16
export const DEFAULT_MAX_CHUNK_BYTES = 512 * 1024

const PSEUDO_FORM_TAGS = new Set([
    'table-tags',
    'inflection-template',
    'no-table-tags',
    'class',
    'template-name',
])

const POS_MAP = new Map([
    ['noun', 'noun'],
    ['proper noun', 'proper-noun'],
    ['proper-noun', 'proper-noun'],
    ['verb', 'verb'],
    ['adj', 'adj'],
    ['adjective', 'adj'],
    ['adv', 'adv'],
    ['adverb', 'adv'],
    ['phrase', 'phrase'],
])

export function normalizeDictionarySearchTerm(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
}

export async function buildDictionaryArtifacts(options) {
    const source = requiredString(options.source, '--source')
    const version = requiredString(options.version, '--version')
    const outDir = options.outDir ?? path.join('data', 'dictionary', 'generated')
    const prefixLength = options.prefixLength ?? DEFAULT_PREFIX_LENGTH
    const entryBucketCount = options.entryBucketCount ?? DEFAULT_ENTRY_BUCKET_COUNT
    const searchShardCount = options.searchShardCount ?? DEFAULT_SEARCH_SHARD_COUNT
    const includeMultiwordSearch = Boolean(options.includeMultiwordSearch)
    const sourceHash = createHash('sha256')
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {}
    const versionDir = path.join(outDir, version)
    const searchDir = path.join(versionDir, 'search')
    const entriesDir = path.join(versionDir, 'entries')

    const entries = new Map()
    const searchRowsByPrefix = new Map()

    onProgress(`Preparing ${versionDir}`)
    await rm(versionDir, { recursive: true, force: true })
    await mkdir(searchDir, { recursive: true })
    await mkdir(entriesDir, { recursive: true })

    onProgress(`Reading ${source}`)
    const lineCount = await readSourceEntries({
        source,
        sourceHash,
        entries,
        searchRowsByPrefix,
        prefixLength,
        entryBucketCount,
        includeMultiwordSearch,
        onProgress,
    })

    onProgress(`Bucketing ${entries.size.toLocaleString()} entries`)
    const entryBuckets = bucketEntries(entries, entryBucketCount)

    onProgress(`Writing ${searchRowsByPrefix.size.toLocaleString()} search prefixes with up to ${searchShardCount} shard(s) each`)
    const searchChunks = await writeSearchChunks(searchRowsByPrefix, searchDir, searchShardCount, onProgress)

    onProgress(`Writing ${entryBuckets.size.toLocaleString()} entry buckets`)
    const largestEntryChunkBytes = await writeEntryChunks(entryBuckets, entriesDir, onProgress)
    const largestChunkBytes = Math.max(searchChunks.largestChunkBytes, largestEntryChunkBytes)

    const searchRowCount = [...searchRowsByPrefix.values()].reduce((total, rows) => total + rows.length, 0)
    const manifest = {
        version,
        prefixLength,
        entryBucketCount,
        searchShardCount,
        generatedAt: new Date().toISOString(),
        searchPath: searchShardCount > 1 ? 'search/{prefix}-{shard}.json' : 'search/{prefix}.json',
        searchIndexPath: 'search-index.json',
        entriesPath: 'entries/{bucket}.json',
        buildStatsPath: 'build-stats.json',
    }
    const stats = {
        sourceFile: source,
        sourceSha256: sourceHash.digest('hex'),
        lineCount,
        entryCount: entries.size,
        searchRowCount,
        searchChunkCount: searchChunks.chunkCount,
        largestChunkBytes,
        generatedAt: manifest.generatedAt,
        scriptVersion: SCRIPT_VERSION,
    }

    await writeJson(path.join(versionDir, manifest.searchIndexPath), searchChunks.index)
    await writeJson(path.join(versionDir, 'manifest.json'), manifest)
    await writeJson(path.join(versionDir, 'build-stats.json'), stats)

    onProgress(`Finished build: ${entries.size.toLocaleString()} entries, ${searchRowCount.toLocaleString()} search rows, largest chunk ${largestChunkBytes.toLocaleString()} bytes`)
    return { manifest, stats, versionDir }
}

export async function loadDotenv(file = '.env') {
    let contents
    try {
        contents = await readFile(file, 'utf8')
    } catch {
        return false
    }

    for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const match = trimmed.match(/^([A-Za-z_]\w*)=(.*)$/)
        if (!match) continue
        const [, key, rawValue] = match
        if (process.env[key] !== undefined) continue
        process.env[key] = parseDotenvValue(rawValue)
    }
    return true
}

export async function validateDictionaryArtifacts(options) {
    const versionDir = requiredString(options.versionDir, '--version-dir')
    const maxChunkBytes = options.maxChunkBytes ?? DEFAULT_MAX_CHUNK_BYTES
    const manifestPath = path.join(versionDir, 'manifest.json')
    const statsPath = path.join(versionDir, 'build-stats.json')
    const problems = []
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {}

    onProgress(`Validating ${versionDir}`)
    const manifest = await readJsonIfExists(manifestPath)
    const stats = await readJsonIfExists(statsPath)
    if (!manifest) problems.push('Missing manifest.json')
    if (!stats) problems.push('Missing build-stats.json')
    if (!stats?.sourceSha256) problems.push('Missing source checksum')

    await validateSearchIndex(versionDir, manifest, maxChunkBytes, problems, onProgress)
    await validateChunks(path.join(versionDir, 'entries'), maxChunkBytes, problems, 'entries', onProgress)

    const samplePrefixLength = manifest?.prefixLength ?? DEFAULT_PREFIX_LENGTH
    for (const sample of options.samples ?? []) {
        const found = await sampleLookup(versionDir, sample, samplePrefixLength)
        if (!found) problems.push(`Missing sample lookup: ${sample}`)
    }

    if (problems.length > 0) {
        return { ok: false, problems }
    }
    onProgress('Validation passed')
    return { ok: true, problems: [] }
}

export async function listUploadObjects(versionDir) {
    const files = await walk(versionDir)
    return files.map((file) => {
        const relativePath = path.relative(versionDir, file).split(path.sep).join('/')
        return {
            file,
            key: `dictionary/${path.basename(versionDir)}/${relativePath}`,
            contentType: contentTypeForFile(file),
            cacheControl: path.basename(file) === 'manifest.json'
                ? 'public, max-age=60'
                : 'public, max-age=31536000, immutable',
        }
    })
}

export async function uploadDictionaryArtifacts(options) {
    const versionDir = requiredString(options.versionDir, '--version-dir')
    const bucket = requiredString(options.bucket, '--bucket')
    const dryRun = Boolean(options.dryRun)
    const force = Boolean(options.force)
    const uploadConcurrency = options.uploadConcurrency ?? DEFAULT_UPLOAD_CONCURRENCY
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {}
    const objects = await listUploadObjects(versionDir)
    const validation = await validateDictionaryArtifacts({
        versionDir,
        samples: options.samples ?? [],
        onProgress,
    })
    if (!validation.ok) {
        throw new Error(`Refusing upload: ${validation.problems.join('; ')}`)
    }

    if (dryRun) {
        onProgress(`Dry run: ${objects.length.toLocaleString()} objects would be uploaded`)
        return objects.map((object) => `DRY RUN ${bucket}/${object.key}`)
    }

    const r2 = r2ConfigFromOptions(options)
    const manifestKey = `dictionary/${path.basename(versionDir)}/manifest.json`
    onProgress(`Checking whether ${manifestKey} already exists`)
    if (!force && await r2ObjectExists(r2, bucket, manifestKey)) {
        throw new Error(`Refusing upload: ${manifestKey} already exists. Pass --force to overwrite.`)
    }

    onProgress(`Uploading ${objects.length.toLocaleString()} objects to ${bucket}`)
    return await uploadR2Objects(r2, bucket, objects, uploadConcurrency, onProgress)
}

export function parseArgs(argv) {
    const result = {}
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]
        if (!arg.startsWith('--')) continue
        const key = arg.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
        const next = argv[index + 1]
        if (!next || next.startsWith('--')) {
            result[key] = true
        } else {
            result[key] = next
            index += 1
        }
    }
    return result
}

export function parsePositiveInteger(value, fallback) {
    if (value === undefined || value === true) return fallback
    const parsed = Number.parseInt(String(value), 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

async function uploadR2Objects(r2, bucket, objects, uploadConcurrency, onProgress) {
    const uploaded = []
    let nextIndex = 0
    let completed = 0
    const workerCount = Math.min(uploadConcurrency, objects.length)

    const uploadNext = async () => {
        while (nextIndex < objects.length) {
            const object = objects[nextIndex]
            nextIndex += 1
            await putR2Object(r2, bucket, object)
            uploaded.push(`UPLOAD ${bucket}/${object.key}`)
            completed += 1
            if (completed % 100 === 0 || completed === objects.length) {
                onProgress(`Uploaded ${completed.toLocaleString()} / ${objects.length.toLocaleString()} objects`)
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, uploadNext))
    return uploaded
}

export function normalizeRawEntry(raw) {
    if (!isRecord(raw) || typeof raw.word !== 'string') return null
    const lemma = raw.word.trim()
    if (!lemma) return null

    const pos = normalizePos(typeof raw.pos === 'string' ? raw.pos : '')
    const normalized = normalizeDictionarySearchTerm(lemma)
    const forms = normalizeForms(raw.forms)
    const details = deriveDetails(raw, forms)
    const article = articleForDetails(details)
    const senses = normalizeSenses(raw.senses)
    if (isFormOfOnlyEntry(raw.senses)) return null
    const sounds = normalizeSounds(raw.sounds)
    const etymology = typeof raw.etymology_text === 'string' ? raw.etymology_text : undefined
    const id = stableId([lemma, pos, senses[0] ?? ''])

    return {
        id,
        lemma,
        normalized,
        pos,
        ...(article ? { article } : {}),
        senses,
        forms,
        details,
        sounds,
        ...(etymology ? { etymology } : {}),
    }
}

export function searchChunkFileName(prefix, shard = 0, shardCount = 1) {
    const encodedPrefix = searchPrefixFileKey(prefix)
    if (shardCount <= 1) return `${encodedPrefix}.json`
    return `${encodedPrefix}-${String(shard).padStart(2, '0')}.json`
}

export function searchPrefixFileKey(prefix) {
    return `p${Buffer.from(prefix, 'utf8').toString('hex')}`
}

export function shouldKeepForm(form) {
    if (!isRecord(form) || typeof form.form !== 'string') return false
    const value = form.form.trim()
    if (!value || value.includes('{{') || value.includes('|')) return false
    const tags = Array.isArray(form.tags) ? form.tags.filter((tag) => typeof tag === 'string') : []
    return tags.every((tag) => !PSEUDO_FORM_TAGS.has(tag))
}

function addSearchRows(rowsByPrefix, entry, prefixLength, entryBucketCount, includeMultiwordSearch) {
    const seenTerms = new Set()
    const add = (term, matchType, rank) => {
        const normalized = normalizeDictionarySearchTerm(term)
        if (normalized.length < prefixLength || seenTerms.has(`${matchType}:${normalized}`)) return
        seenTerms.add(`${matchType}:${normalized}`)
        const prefix = normalized.slice(0, prefixLength)
        const rows = rowsByPrefix.get(prefix) ?? []
        rows.push({
            id: entry.id,
            term: matchType === 'form' ? entry.lemma : term,
            normalized,
            lemma: entry.lemma,
            pos: entry.pos,
            ...(entry.article ? { article: entry.article } : {}),
            ...(matchType === 'form' ? { matchedTerm: term } : {}),
            matchType,
            rank,
            entryBucket: entryBucketForId(entry.id, entryBucketCount),
        })
        rowsByPrefix.set(prefix, rows)
    }

    add(entry.lemma, 'lemma', 0)
    for (const form of entry.forms) {
        if (!includeMultiwordSearch && /\s/.test(normalizeDictionarySearchTerm(form.form))) continue
        add(form.form, 'form', 10)
    }
}

function shardSearchRows(rows, shardCount) {
    const shards = new Map()
    for (let index = 0; index < shardCount; index += 1) {
        shards.set(index, [])
    }
    for (const row of rows) {
        const shard = stableShard(`${row.id}:${row.normalized}:${row.matchType}`, shardCount)
        shards.get(shard).push(row)
    }
    return shards
}

function normalizeForms(forms) {
    if (!Array.isArray(forms)) return []
    const result = []
    const seen = new Set()
    for (const form of forms) {
        if (!shouldKeepForm(form)) continue
        const value = form.form.trim()
        const tags = Array.isArray(form.tags) ? form.tags.filter((tag) => typeof tag === 'string') : []
        const key = `${value}:${tags.join(',')}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ form: value, tags })
    }
    return result
}

function deriveDetails(raw, forms) {
    const details = {}
    const tags = forms.flatMap((form) => form.tags)
    const gender = tags.find((tag) => ['masculine', 'feminine', 'neuter'].includes(tag))
    if (gender) details.gender = gender
    details.genitive = findForm(forms, ['genitive'])
    details.plural = findForm(forms, ['plural'])
    details.pastParticiple = findForm(forms, ['participle', 'past']) ?? findForm(forms, ['past participle'])
    details.comparative = findForm(forms, ['comparative'])
    details.superlative = findForm(forms, ['superlative'])
    return details
}

function findForm(forms, requiredTags) {
    const match = forms.find((form) => requiredTags.every((tag) => form.tags.includes(tag)))
    return match?.form
}

function articleForDetails(details) {
    if (details.gender === 'masculine') return 'der'
    if (details.gender === 'feminine') return 'die'
    if (details.gender === 'neuter') return 'das'
    return undefined
}

function normalizeSenses(senses) {
    if (!Array.isArray(senses)) return []
    return senses
        .flatMap((sense) => isRecord(sense) && Array.isArray(sense.glosses) ? sense.glosses : [])
        .filter((gloss) => typeof gloss === 'string' && gloss.trim())
        .map((gloss) => gloss.trim())
        .slice(0, 8)
}

function isFormOfOnlyEntry(senses) {
    if (!Array.isArray(senses) || senses.length === 0) return false
    return senses.every((sense) => isRecord(sense) && hasFormOf(sense))
}

function hasFormOf(sense) {
    if (Array.isArray(sense.form_of) && sense.form_of.length > 0) return true
    if (Array.isArray(sense.alt_of) && sense.alt_of.length > 0) return true
    return false
}

function normalizeSounds(sounds) {
    if (!Array.isArray(sounds)) return []
    return sounds
        .flatMap((sound) => isRecord(sound) && typeof sound.ipa === 'string' ? [sound.ipa] : [])
        .slice(0, 4)
}

function normalizePos(pos) {
    return POS_MAP.get(pos.toLowerCase()) ?? 'other'
}

function entryBucketForId(id, bucketCount) {
    const number = Number.parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16)
    return String(number % bucketCount).padStart(4, '0')
}

function stableId(parts) {
    return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16)
}

function stableShard(value, shardCount) {
    if (shardCount <= 1) return 0
    const number = Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16)
    return number % shardCount
}

async function writeJson(file, value) {
    const body = `${JSON.stringify(value)}\n`
    await writeFile(file, body, 'utf8')
    return Buffer.byteLength(body)
}

async function readSourceEntries(options) {
    const stream = createReadStream(options.source, { encoding: 'utf8' })
    stream.on('data', (chunk) => options.sourceHash.update(chunk))

    const reader = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
    })

    let lineCount = 0
    let lastProgressAt = Date.now()
    for await (const line of reader) {
        const progress = processSourceLine(line, options)
        if (!progress) continue
        lineCount += 1
        if (lineCount % 100000 === 0 || Date.now() - lastProgressAt > 5000) {
            lastProgressAt = Date.now()
            options.onProgress(`Read ${lineCount.toLocaleString()} lines, kept ${options.entries.size.toLocaleString()} entries`)
        }
    }
    return lineCount
}

function processSourceLine(line, options) {
    if (!line.trim()) return false
    const raw = JSON.parse(line)
    const entry = normalizeRawEntry(raw)
    if (!entry) return true
    options.entries.set(entry.id, entry)
    addSearchRows(
        options.searchRowsByPrefix,
        entry,
        options.prefixLength,
        options.entryBucketCount,
        options.includeMultiwordSearch
    )
    return true
}

function bucketEntries(entries, entryBucketCount) {
    const buckets = new Map()
    for (const entry of entries.values()) {
        const bucket = entryBucketForId(entry.id, entryBucketCount)
        const bucketEntries = buckets.get(bucket) ?? {}
        bucketEntries[entry.id] = entry
        buckets.set(bucket, bucketEntries)
    }
    return buckets
}

async function writeSearchChunks(searchRowsByPrefix, searchDir, searchShardCount, onProgress) {
    let largestChunkBytes = 0
    let writtenSearchChunks = 0
    const index = {}
    for (const [prefix, rows] of searchRowsByPrefix) {
        const result = await writeSearchPrefixChunks(prefix, rows, searchDir, searchShardCount, writtenSearchChunks, onProgress)
        largestChunkBytes = Math.max(largestChunkBytes, result.largestChunkBytes)
        writtenSearchChunks = result.writtenSearchChunks
        if (result.files.length > 0) {
            index[searchPrefixFileKey(prefix)] = result.files
        }
    }
    return { largestChunkBytes, index, chunkCount: writtenSearchChunks }
}

async function writeSearchPrefixChunks(prefix, rows, searchDir, searchShardCount, writtenSearchChunks, onProgress) {
    let largestChunkBytes = 0
    const files = []
    const shards = shardSearchRows(rows, searchShardCount)
    for (const [shard, shardRows] of shards) {
        if (shardRows.length === 0) continue
        shardRows.sort((a, b) => a.rank - b.rank || a.lemma.localeCompare(b.lemma, 'de'))
        const file = searchChunkFileName(prefix, shard, searchShardCount)
        const bytes = await writeJson(
            path.join(searchDir, file),
            shardRows
        )
        files.push(file)
        largestChunkBytes = Math.max(largestChunkBytes, bytes)
        writtenSearchChunks += 1
        if (writtenSearchChunks % 500 === 0) {
            onProgress(`Wrote ${writtenSearchChunks.toLocaleString()} search chunks`)
        }
    }
    return { largestChunkBytes, writtenSearchChunks, files }
}

async function writeEntryChunks(entryBuckets, entriesDir, onProgress) {
    let largestChunkBytes = 0
    let writtenEntryChunks = 0
    for (const [bucket, bucketEntries] of entryBuckets) {
        const bytes = await writeJson(path.join(entriesDir, `${bucket}.json`), { entries: bucketEntries })
        largestChunkBytes = Math.max(largestChunkBytes, bytes)
        writtenEntryChunks += 1
        if (writtenEntryChunks % 500 === 0) {
            onProgress(`Wrote ${writtenEntryChunks.toLocaleString()} entry chunks`)
        }
    }
    return largestChunkBytes
}

async function readJsonIfExists(file) {
    try {
        return JSON.parse(await readFile(file, 'utf8'))
    } catch {
        return null
    }
}

async function validateChunks(dir, maxChunkBytes, problems, label, onProgress) {
    let files
    try {
        files = await readdir(dir)
    } catch {
        problems.push(`Missing ${label} directory`)
        return
    }
    onProgress(`Validating ${files.length.toLocaleString()} ${label} chunks`)
    if (files.length === 0) problems.push(`No ${label} chunks`)
    let checked = 0
    for (const file of files) {
        if (!file.endsWith('.json')) continue
        await validateChunkFile(dir, file, maxChunkBytes, problems, label)
        checked += 1
        if (checked % 1000 === 0) {
            onProgress(`Validated ${checked.toLocaleString()} ${label} chunks`)
        }
    }
}

async function validateChunkFile(dir, file, maxChunkBytes, problems, label) {
    const fullPath = path.join(dir, file)
    const info = await stat(fullPath)
    if (info.size > maxChunkBytes) problems.push(`${label}/${file} exceeds ${maxChunkBytes} bytes`)
    const parsed = await readJsonIfExists(fullPath)
    if (!parsed) problems.push(`${label}/${file} is malformed JSON`)
    if (label === 'search' && !Array.isArray(parsed)) problems.push(`${label}/${file} must be an array`)
    if (label === 'entries' && !isRecord(parsed?.entries)) problems.push(`${label}/${file} must contain entries`)
}

async function validateSearchIndex(versionDir, manifest, maxChunkBytes, problems, onProgress) {
    const searchDir = path.join(versionDir, 'search')
    const indexPath = manifest?.searchIndexPath
    if (typeof indexPath !== 'string' || !indexPath.trim()) {
        problems.push('Missing search-index.json')
        return
    }

    let indexContents
    try {
        indexContents = await readFile(path.join(versionDir, indexPath), 'utf8')
    } catch {
        problems.push('Missing search-index.json')
        return
    }

    let index
    try {
        index = JSON.parse(indexContents)
    } catch {
        problems.push(`${indexPath} is malformed JSON`)
        return
    }
    if (!isRecord(index)) {
        problems.push(`${indexPath} must be an object`)
        return
    }

    let files
    try {
        files = (await readdir(searchDir)).filter((file) => file.endsWith('.json'))
    } catch {
        problems.push('Missing search directory')
        return
    }

    onProgress(`Validating ${files.length.toLocaleString()} indexed search chunks`)
    if (files.length === 0) problems.push('No search chunks')

    const existingFiles = new Set(files)
    const indexedFiles = new Set()
    let checked = 0

    for (const [prefixKey, prefixFiles] of Object.entries(index)) {
        checked = await validateSearchIndexEntry({
            prefixKey,
            prefixFiles,
            searchDir,
            existingFiles,
            indexedFiles,
            maxChunkBytes,
            problems,
            checked,
            onProgress,
        })
    }

    for (const file of existingFiles) {
        if (!indexedFiles.has(file)) {
            problems.push(`search/${file} is not listed in search-index.json`)
        }
    }
}

async function validateSearchIndexEntry(options) {
    const {
        prefixKey,
        prefixFiles,
        searchDir,
        existingFiles,
        indexedFiles,
        maxChunkBytes,
        problems,
        onProgress,
    } = options
    let checked = options.checked

    if (!Array.isArray(prefixFiles)) {
        problems.push(`search-index.json entry ${prefixKey} must be an array`)
        return checked
    }
    if (prefixFiles.length === 0) {
        problems.push(`search-index.json entry ${prefixKey} must not be empty`)
        return checked
    }

    for (const file of prefixFiles) {
        if (!isSearchIndexFileName(file)) {
            problems.push(`search-index.json entry ${prefixKey} contains invalid file ${String(file)}`)
            continue
        }
        indexedFiles.add(file)
        if (!existingFiles.has(file)) {
            problems.push(`search/${file} is listed in search-index.json but missing`)
            continue
        }
        await validateIndexedSearchChunk(searchDir, file, maxChunkBytes, problems)
        checked += 1
        if (checked % 1000 === 0) {
            onProgress(`Validated ${checked.toLocaleString()} indexed search chunks`)
        }
    }

    return checked
}

function isSearchIndexFileName(file) {
    return typeof file === 'string' && file.endsWith('.json')
}

async function validateIndexedSearchChunk(searchDir, file, maxChunkBytes, problems) {
    const fullPath = path.join(searchDir, file)
    const info = await stat(fullPath)
    if (info.size > maxChunkBytes) problems.push(`search/${file} exceeds ${maxChunkBytes} bytes`)
    const parsed = await readJsonIfExists(fullPath)
    if (!parsed) {
        problems.push(`search/${file} is malformed JSON`)
        return
    }
    if (!Array.isArray(parsed)) {
        problems.push(`search/${file} must be an array`)
        return
    }
    if (parsed.length === 0) {
        problems.push(`search/${file} must not be empty`)
    }
}

async function sampleLookup(versionDir, sample, prefixLength) {
    const normalized = normalizeDictionarySearchTerm(sample)
    const prefix = normalized.slice(0, prefixLength)
    const manifest = await readJsonIfExists(path.join(versionDir, 'manifest.json'))
    const searchIndex = await readJsonIfExists(path.join(versionDir, manifest?.searchIndexPath ?? 'search-index.json'))
    const files = isRecord(searchIndex) ? searchIndex[searchPrefixFileKey(prefix)] : undefined
    if (!Array.isArray(files)) return false
    for (const file of files) {
        if (typeof file !== 'string') continue
        const rows = await readJsonIfExists(path.join(versionDir, 'search', file))
        if (Array.isArray(rows) && rows.some((row) => row.normalized === normalized)) return true
    }
    return false
}

async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...await walk(fullPath))
        } else {
            files.push(fullPath)
        }
    }
    return files
}

function contentTypeForFile(file) {
    if (file.endsWith('.json')) return 'application/json; charset=utf-8'
    return 'application/octet-stream'
}

function requiredString(value, name) {
    if (typeof value === 'string' && value.trim()) return value
    throw new Error(`Missing required ${name}`)
}

function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDotenvValue(value) {
    const trimmed = value.trim()
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
        || (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1)
    }
    return trimmed
}

function r2ConfigFromOptions(options) {
    const accountId = options.accountId ?? process.env.R2_ACCOUNT_ID
    const endpoint = options.endpoint ?? process.env.R2_ENDPOINT
    const accessKeyId = options.accessKeyId
        ?? process.env.R2_ACCESS_KEY_ID
        ?? process.env.AWS_ACCESS_KEY_ID
        ?? process.env.R2_API_TOKEN_ID
    const secretAccessKey = options.secretAccessKey
        ?? process.env.R2_SECRET_ACCESS_KEY
        ?? process.env.AWS_SECRET_ACCESS_KEY
        ?? tokenValueSecret(process.env.R2_API_TOKEN_VALUE)
    const sessionToken = options.sessionToken
        ?? process.env.R2_SESSION_TOKEN
        ?? process.env.AWS_SESSION_TOKEN
    const resolvedEndpoint = endpoint ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

    return {
        endpoint: requiredString(resolvedEndpoint, '--endpoint or R2_ACCOUNT_ID'),
        accessKeyId: requiredString(accessKeyId, '--access-key-id or R2_ACCESS_KEY_ID'),
        secretAccessKey: requiredString(secretAccessKey, '--secret-access-key or R2_SECRET_ACCESS_KEY'),
        ...(sessionToken ? { sessionToken } : {}),
        fetcher: options.fetcher ?? globalThis.fetch,
    }
}

function tokenValueSecret(value) {
    if (!value) return undefined
    return createHash('sha256').update(value).digest('hex')
}

async function r2ObjectExists(r2, bucket, key) {
    const response = await signedR2Request(r2, 'HEAD', bucket, key)
    if (response.status === 404) return false
    if (response.ok) return true
    throw new Error(`R2 object existence check failed: ${response.status} ${await response.text()}`)
}

async function putR2Object(r2, bucket, object) {
    const body = await readFile(object.file)
    const response = await signedR2Request(r2, 'PUT', bucket, object.key, {
        body,
        contentType: object.contentType,
        cacheControl: object.cacheControl,
    })
    if (!response.ok) {
        throw new Error(`R2 upload failed for ${object.key}: ${response.status} ${await response.text()}`)
    }
}

async function signedR2Request(r2, method, bucket, key, options = {}) {
    const body = options.body ?? Buffer.alloc(0)
    const url = new URL(`${r2.endpoint.replace(/\/$/, '')}/${bucket}/${encodeS3Key(key)}`)
    const payloadHash = sha256Hex(body)
    const amzDate = amzTimestamp(new Date())
    const dateStamp = amzDate.slice(0, 8)
    const headers = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        ...(options.contentType ? { 'content-type': options.contentType } : {}),
        ...(options.cacheControl ? { 'cache-control': options.cacheControl } : {}),
        ...(r2.sessionToken ? { 'x-amz-security-token': r2.sessionToken } : {}),
    }
    const authorization = signAwsRequest({
        method,
        url,
        headers,
        payloadHash,
        dateStamp,
        amzDate,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
    })

    return await r2.fetcher(url, {
        method,
        headers: {
            ...headers,
            authorization,
        },
        ...(method === 'PUT' ? { body } : {}),
    })
}

function signAwsRequest({ method, url, headers, payloadHash, dateStamp, amzDate, accessKeyId, secretAccessKey }) {
    const signedHeaders = Object.keys(headers).map((key) => key.toLowerCase()).sort()
    const canonicalHeaders = signedHeaders.map((key) => `${key}:${headers[key].trim()}\n`).join('')
    const canonicalRequest = [
        method,
        url.pathname,
        '',
        canonicalHeaders,
        signedHeaders.join(';'),
        payloadHash,
    ].join('\n')
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join('\n')
    const signingKey = hmac(
        hmac(
            hmac(
                hmac(`AWS4${secretAccessKey}`, dateStamp),
                'auto'
            ),
            's3'
        ),
        'aws4_request'
    )
    const signature = hmacHex(signingKey, stringToSign)
    return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`
}

function encodeS3Key(key) {
    return key.split('/').map((part) => encodeURIComponent(part)).join('/')
}

function amzTimestamp(date) {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

function sha256Hex(value) {
    return createHash('sha256').update(value).digest('hex')
}

function hmac(key, value) {
    return createHmac('sha256', key).update(value).digest()
}

function hmacHex(key, value) {
    return createHmac('sha256', key).update(value).digest('hex')
}
