import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getWranglerLogPath } from '../build-lib.mjs'

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
})
