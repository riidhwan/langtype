import { mkdir } from 'node:fs/promises'
import { getWranglerLogPath, runCommand } from './build-lib.mjs'

const wranglerLogPath = getWranglerLogPath()

await mkdir(wranglerLogPath, { recursive: true })

const env = {
    ...process.env,
    WRANGLER_LOG_PATH: wranglerLogPath,
}

await runCommand('vite', ['build'], { env })
await runCommand('tsc', ['--noEmit'], { env })
