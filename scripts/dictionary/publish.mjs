#!/usr/bin/env node
import {
    buildDictionaryArtifacts,
    DEFAULT_ENTRY_BUCKET_COUNT,
    DEFAULT_PREFIX_LENGTH,
    DEFAULT_SEARCH_SHARD_COUNT,
    DEFAULT_UPLOAD_CONCURRENCY,
    loadDotenv,
    parseArgs,
    parsePositiveInteger,
    uploadDictionaryArtifacts,
    validateDictionaryArtifacts,
} from './dictionary-lib.mjs'

const args = parseArgs(process.argv.slice(2))
await loadDotenv(args.envFile ?? '.env')
const onProgress = createProgressLogger()
const build = await buildDictionaryArtifacts({
    source: args.source,
    version: args.version,
    outDir: args.outDir,
    prefixLength: parsePositiveInteger(args.prefixLength, DEFAULT_PREFIX_LENGTH),
    entryBucketCount: parsePositiveInteger(args.entryBucketCount, DEFAULT_ENTRY_BUCKET_COUNT),
    searchShardCount: parsePositiveInteger(args.searchShardCount, DEFAULT_SEARCH_SHARD_COUNT),
    includeMultiwordSearch: args.includeMultiwordSearch,
    onProgress,
})
const samples = typeof args.samples === 'string' ? args.samples.split(',').filter(Boolean) : ['arbeiten', 'Arbeit']
const validation = await validateDictionaryArtifacts({ versionDir: build.versionDir, samples, onProgress })

if (!validation.ok) {
    for (const problem of validation.problems) console.error(problem)
    process.exit(1)
}

const lines = await uploadDictionaryArtifacts({
    versionDir: build.versionDir,
    bucket: args.bucket ?? process.env.R2_DICTIONARY_BUCKET,
    dryRun: args.dryRun,
    force: args.force,
    accountId: args.accountId,
    endpoint: args.endpoint,
    accessKeyId: args.accessKeyId,
    secretAccessKey: args.secretAccessKey,
    uploadConcurrency: parsePositiveInteger(args.uploadConcurrency, DEFAULT_UPLOAD_CONCURRENCY),
    samples,
    onProgress,
})

for (const line of lines) console.log(line)

if (args.publicBaseUrl) {
    console.log(`${String(args.publicBaseUrl).replace(/\/$/, '')}/dictionary/${args.version}/manifest.json`)
}

function createProgressLogger() {
    const startedAt = Date.now()
    return (message) => {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
        console.error(`[dict:publish +${elapsedSeconds}s] ${message}`)
    }
}
