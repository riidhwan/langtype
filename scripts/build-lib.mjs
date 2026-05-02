import path from 'node:path'
import { spawn } from 'node:child_process'

export function getWranglerLogPath(env = process.env, cwd = process.cwd()) {
    if (env.WRANGLER_LOG_PATH?.trim()) {
        return env.WRANGLER_LOG_PATH
    }

    return path.join(cwd, '.cache', 'wrangler-logs')
}

export function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32',
            ...options,
        })

        child.on('error', reject)
        child.on('exit', (code) => {
            if (code === 0) {
                resolve()
                return
            }

            reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
        })
    })
}
