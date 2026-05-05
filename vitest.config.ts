import { coverageConfigDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './tests/setup.ts',
        exclude: ['**/node_modules/**', '**/e2e/**'],
        coverage: {
            provider: 'v8',
            exclude: [
                ...coverageConfigDefaults.exclude,
                'src/data/collections/**/*.json',
                'src/routeTree.gen.ts',
            ],
            thresholds: {
                lines: 90,
                statements: 90,
                functions: 90,
                branches: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
})
