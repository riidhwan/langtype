#!/usr/bin/env node
import { loadDotenv, parseArgs, uploadDictionaryArtifacts } from './dictionary-lib.mjs'

const args = parseArgs(process.argv.slice(2))
await loadDotenv(args.envFile ?? '.env')
const onProgress = createProgressLogger()
const versionDir = args.versionDir ?? `data/dictionary/generated/${args.version}`
const bucket = args.bucket ?? process.env.R2_DICTIONARY_BUCKET
const lines = await uploadDictionaryArtifacts({
    versionDir,
    bucket,
    dryRun: args.dryRun,
    force: args.force,
    accountId: args.accountId,
    endpoint: args.endpoint,
    accessKeyId: args.accessKeyId,
    secretAccessKey: args.secretAccessKey,
    uploadConcurrency: Number.parseInt(args.uploadConcurrency ?? '16', 10),
    onProgress,
})

for (const line of lines) console.log(line)

if (args.publicBaseUrl) {
    const version = args.version ?? versionDir.split('/').at(-1)
    console.log(`${String(args.publicBaseUrl).replace(/\/$/, '')}/dictionary/${version}/manifest.json`)
}

function createProgressLogger() {
    const startedAt = Date.now()
    return (message) => {
        const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
        console.error(`[dict:upload +${elapsedSeconds}s] ${message}`)
    }
}
