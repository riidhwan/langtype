#!/usr/bin/env node
import {
    DEFAULT_ENTRY_BUCKET_COUNT,
    DEFAULT_PREFIX_LENGTH,
    DEFAULT_SEARCH_SHARD_COUNT,
    buildDictionaryArtifacts,
    loadDotenv,
    parseArgs,
    parsePositiveInteger,
} from './dictionary-lib.mjs'

const args = parseArgs(process.argv.slice(2))
await loadDotenv(args.envFile ?? '.env')
const onProgress = createProgressLogger()
const result = await buildDictionaryArtifacts({
    source: args.source,
    version: args.version,
    outDir: args.outDir,
    prefixLength: parsePositiveInteger(args.prefixLength, DEFAULT_PREFIX_LENGTH),
    entryBucketCount: parsePositiveInteger(args.entryBucketCount, DEFAULT_ENTRY_BUCKET_COUNT),
    searchShardCount: parsePositiveInteger(args.searchShardCount, DEFAULT_SEARCH_SHARD_COUNT),
    includeMultiwordSearch: args.includeMultiwordSearch,
    onProgress,
})

console.log(`Built ${result.manifest.version}`)
console.log(`Entries: ${result.stats.entryCount}`)
console.log(`Search rows: ${result.stats.searchRowCount}`)
console.log(`Output: ${result.versionDir}`)

function createProgressLogger() {
    const startedAt = Date.now()
    return (message) => {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
        console.error(`[dict:build +${elapsedSeconds}s] ${message}`)
    }
}
