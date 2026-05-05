import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getWranglerLogPath, runCommand } from '../build-lib.mjs'

describe('build tooling', () => {
    it('defaults Wrangler logs to a project-local cache directory', () => {
        expect(getWranglerLogPath({}, '/workspace/langtype')).toBe(
            path.join('/workspace/langtype', '.cache', 'wrangler-logs')
        )
    })

    it('respects an explicit Wrangler log path', () => {
        expect(getWranglerLogPath({ WRANGLER_LOG_PATH: '.wrangler/logs' }, '/workspace/langtype')).toBe(
            '.wrangler/logs'
        )
    })

    it('resolves when a spawned command exits successfully', async () => {
        await expect(runCommand(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' })).resolves.toBeUndefined()
    })

    it('rejects when a spawned command exits unsuccessfully', async () => {
        await expect(runCommand(process.execPath, ['-e', 'process.exit(7)'], { stdio: 'ignore' })).rejects.toThrow(
            `${process.execPath} -e process.exit(7) exited with code 7`
        )
    })
})
