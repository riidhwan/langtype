#!/usr/bin/env node
import { DEFAULT_MAX_CHUNK_BYTES, loadDotenv, parseArgs, parsePositiveInteger, validateDictionaryArtifacts } from './dictionary-lib.mjs'

const args = parseArgs(process.argv.slice(2))
await loadDotenv(args.envFile ?? '.env')
const onProgress = createProgressLogger()
const versionDir = args.versionDir ?? `data/dictionary/generated/${args.version}`
const samples = typeof args.samples === 'string' ? args.samples.split(',').filter(Boolean) : []
const result = await validateDictionaryArtifacts({
    versionDir,
    samples,
    maxChunkBytes: parsePositiveInteger(args.maxChunkBytes, DEFAULT_MAX_CHUNK_BYTES),
    onProgress,
})

if (!result.ok) {
    for (const problem of result.problems) console.error(problem)
    process.exit(1)
}

console.log(`Validated ${versionDir}`)

function createProgressLogger() {
    const startedAt = Date.now()
    return (message) => {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
        console.error(`[dict:validate +${elapsedSeconds}s] ${message}`)
    }
}
