import { describe, expect, it } from 'vitest'
import { buildAiChatImportPrompt, parseAiChatImportJson } from '../aiChatImport'

describe('parseAiChatImportJson', () => {
    it('parses valid segment JSON into native translation markup', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'Can you help me?',
                segments: [
                    { kind: 'prefill', text: 'Kannst du ' },
                    { kind: 'type', text: 'mir helfen' },
                    { kind: 'prefill', text: '?' },
                ],
            },
        ]))

        expect(result).toMatchObject({
            challenges: [{ original: 'Can you help me?', translation: '(Kannst du )mir helfen(?)' }],
            skippedCount: 0,
            totalRows: 1,
        })
    })

    it('preserves repeated words across segments', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'Again and again.',
                segments: [
                    { kind: 'type', text: 'Immer' },
                    { kind: 'prefill', text: ' und ' },
                    { kind: 'type', text: 'immer wieder' },
                ],
            },
        ]))

        expect(result.challenges).toEqual([
            { original: 'Again and again.', translation: 'Immer( und )immer wieder' },
        ])
    })

    it('supports multiple prefilled regions and merges adjacent segment kinds', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'I like tea, but he likes coffee.',
                segments: [
                    { kind: 'prefill', text: 'Ich ' },
                    { kind: 'prefill', text: 'mag ' },
                    { kind: 'type', text: 'Tee' },
                    { kind: 'prefill', text: ', aber ' },
                    { kind: 'type', text: 'er ' },
                    { kind: 'type', text: 'mag Kaffee' },
                    { kind: 'prefill', text: '.' },
                ],
            },
        ]))

        expect(result.challenges).toEqual([
            { original: 'I like tea, but he likes coffee.', translation: '(Ich mag )Tee(, aber )er mag Kaffee(.)' },
        ])
    })

    it('parses the native translation fallback', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'Can you help me?',
                translation: '(Kannst du )mir helfen?',
            },
        ]))

        expect(result.challenges).toEqual([
            { original: 'Can you help me?', translation: '(Kannst du )mir helfen?' },
        ])
    })

    it('strips an accidentally pasted fenced JSON block', () => {
        const result = parseAiChatImportJson(`\`\`\`json
[
  {
    "original": "Hello",
    "translation": "Hallo"
  }
]
\`\`\``)

        expect(result.challenges).toEqual([{ original: 'Hello', translation: 'Hallo' }])
    })

    it('reports malformed JSON', () => {
        const result = parseAiChatImportJson('[{')

        expect(result).toEqual({
            challenges: [],
            skippedCount: 0,
            totalRows: 0,
            error: 'The pasted JSON could not be parsed.',
        })
    })

    it('reports non-array JSON', () => {
        const result = parseAiChatImportJson('{"original":"Hello","translation":"Hallo"}')

        expect(result).toEqual({
            challenges: [],
            skippedCount: 0,
            totalRows: 0,
            error: 'The pasted JSON must be an array of challenges.',
        })
    })

    it('skips segment rows without a non-empty type segment', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'Hello',
                segments: [{ kind: 'prefill', text: 'Hallo' }],
            },
            {
                original: 'Thanks',
                segments: [{ kind: 'type', text: '   ' }],
            },
        ]))

        expect(result.challenges).toEqual([])
        expect(result.skippedCount).toBe(2)
    })

    it('skips rows with invalid segment kinds', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            {
                original: 'Hello',
                segments: [{ kind: 'hint', text: 'Hallo' }],
            },
        ]))

        expect(result.challenges).toEqual([])
        expect(result.skippedCount).toBe(1)
    })

    it('keeps valid rows and counts invalid rows in mixed input', () => {
        const result = parseAiChatImportJson(JSON.stringify([
            { original: 'Hello', translation: 'Hallo' },
            { original: 'Bad', segments: [{ kind: 'prefill', text: 'Nur Hinweis' }] },
            { original: 'Bye', segments: [{ kind: 'type', text: 'Tschuss' }] },
        ]))

        expect(result.challenges).toEqual([
            { original: 'Hello', translation: 'Hallo' },
            { original: 'Bye', translation: 'Tschuss' },
        ])
        expect(result.skippedCount).toBe(1)
        expect(result.totalRows).toBe(3)
    })
})

describe('buildAiChatImportPrompt', () => {
    it('includes the request, count, JSON-code-block instruction, and segment schema', () => {
        const prompt = buildAiChatImportPrompt({
            request: 'Practice restaurant phrases',
            count: 7,
            levelStyle: 'A2 casual',
        })

        expect(prompt).toContain('Create 7 German translation typing challenges.')
        expect(prompt).toContain('User request: Practice restaurant phrases')
        expect(prompt).toContain('Level/style: A2 casual')
        expect(prompt).toContain('Return only one JSON code block and no explanation.')
        expect(prompt).toContain('These are fill-in-the-blank challenges')
        expect(prompt).toContain('"segments"')
        expect(prompt).toContain('"kind":"prefill"')
        expect(prompt).toContain('"kind":"type"')
    })
})
