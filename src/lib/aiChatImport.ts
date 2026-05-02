const DEFAULT_IMPORT_COUNT = 10

type SegmentKind = 'prefill' | 'type'

interface AiChatSegment {
    kind: SegmentKind
    text: string
}

interface ImportChallenge {
    original?: string
    translation: string
}

interface ParseSuccess {
    challenges: ImportChallenge[]
    skippedCount: number
    totalRows: number
    error?: undefined
}

interface ParseFailure {
    challenges: []
    skippedCount: 0
    totalRows: 0
    error: string
}

export type AiChatImportParseResult = ParseSuccess | ParseFailure

interface PromptOptions {
    request: string
    count?: number
    levelStyle?: string
}

/** Builds the local-only prompt users copy into their preferred external AI chat. */
export function buildAiChatImportPrompt({
    request,
    count = DEFAULT_IMPORT_COUNT,
    levelStyle = '',
}: PromptOptions): string {
    const normalizedCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : DEFAULT_IMPORT_COUNT
    const trimmedRequest = request.trim()
    const trimmedLevelStyle = levelStyle.trim()

    return [
        `Create ${normalizedCount} German translation typing challenges.`,
        trimmedRequest ? `User request: ${trimmedRequest}` : 'User request: general useful German practice.',
        trimmedLevelStyle ? `Level/style: ${trimmedLevelStyle}` : 'Level/style: choose an appropriate beginner-friendly level unless the request says otherwise.',
        '',
        'Return only one JSON code block and no explanation.',
        'These are fill-in-the-blank challenges: the German answer is partly visible to the learner, and the learner types the missing blank parts.',
        'The JSON code block content must be a top-level array. Each row must use this schema:',
        '[{"original":"English prompt or context","segments":[{"kind":"prefill","text":"German context shown automatically"},{"kind":"type","text":"German text the learner types"}]}]',
        '',
        'Segment rules:',
        '- Split the full German answer into ordered segment objects.',
        '- kind "prefill" means German text that is already visible in the fill-in-the-blank sentence.',
        '- kind "type" means the missing German text the learner must type into the blank.',
        '- Every part of the German answer must appear in order across the segments.',
        '- Keep intentional spaces inside segment text exactly where they belong.',
        '- Include at least one non-empty type segment in every row.',
        '',
        'Examples:',
        '```json',
        '[',
        '  {',
        '    "original": "Can you help me?",',
        '    "segments": [',
        '      { "kind": "prefill", "text": "Kannst du " },',
        '      { "kind": "type", "text": "mir helfen" },',
        '      { "kind": "prefill", "text": "?" }',
        '    ]',
        '  },',
        '  {',
        '    "original": "I like tea, but he likes coffee.",',
        '    "segments": [',
        '      { "kind": "type", "text": "Ich mag Tee" },',
        '      { "kind": "prefill", "text": ", aber " },',
        '      { "kind": "type", "text": "er mag Kaffee" },',
        '      { "kind": "prefill", "text": "." }',
        '    ]',
        '  },',
        '  {',
        '    "original": "Again and again.",',
        '    "segments": [',
        '      { "kind": "type", "text": "Immer" },',
        '      { "kind": "prefill", "text": " und " },',
        '      { "kind": "type", "text": "immer wieder" },',
        '      { "kind": "prefill", "text": "." }',
        '    ]',
        '  }',
        ']',
        '```',
        '',
        'Now return the requested challenges as only one JSON code block. The user will paste the copied JSON code block content into their typing practice app.',
    ].join('\n')
}

/** Parses raw AI-chat JSON or a single pasted fenced JSON block into importable challenges. */
export function parseAiChatImportJson(input: string): AiChatImportParseResult {
    const stripped = stripOuterJsonFence(input.trim())
    if (!stripped) {
        return { challenges: [], skippedCount: 0, totalRows: 0, error: 'Paste JSON copied from the AI code block.' }
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(stripped)
    } catch {
        return { challenges: [], skippedCount: 0, totalRows: 0, error: 'The pasted JSON could not be parsed.' }
    }

    if (!Array.isArray(parsed)) {
        return { challenges: [], skippedCount: 0, totalRows: 0, error: 'The pasted JSON must be an array of challenges.' }
    }

    const challenges: ImportChallenge[] = []
    let skippedCount = 0

    for (const row of parsed) {
        const challenge = parseImportRow(row)
        if (challenge) {
            challenges.push(challenge)
        } else {
            skippedCount += 1
        }
    }

    return {
        challenges,
        skippedCount,
        totalRows: parsed.length,
    }
}

function parseImportRow(row: unknown): ImportChallenge | null {
    if (!isRecord(row)) return null

    const original = typeof row.original === 'string' ? row.original : undefined

    if (typeof row.translation === 'string' && row.translation.trim().length > 0) {
        return { original, translation: row.translation }
    }

    if (!Array.isArray(row.segments)) return null

    const segments = parseSegments(row.segments)
    if (!segments) return null

    return {
        original,
        translation: segmentsToTranslation(segments),
    }
}

function parseSegments(rows: unknown[]): AiChatSegment[] | null {
    const segments: AiChatSegment[] = []
    let hasTypeSegment = false

    for (const row of rows) {
        if (!isRecord(row)) return null
        if (row.kind !== 'prefill' && row.kind !== 'type') return null
        if (typeof row.text !== 'string' || row.text.trim().length === 0) return null

        const last = segments.at(-1)
        if (last?.kind === row.kind) {
            last.text += row.text
        } else {
            segments.push({ kind: row.kind, text: row.text })
        }

        if (row.kind === 'type') hasTypeSegment = true
    }

    return hasTypeSegment ? segments : null
}

function segmentsToTranslation(segments: AiChatSegment[]): string {
    return segments
        .map((segment) => segment.kind === 'prefill' ? `(${segment.text})` : segment.text)
        .join('')
}

function stripOuterJsonFence(input: string): string {
    const lines = input.split('\n')
    if (lines.length < 3) return input

    const firstLine = lines[0].trim().toLowerCase()
    const lastLine = lines.at(-1)?.trim()
    if ((firstLine === '```' || firstLine === '```json') && lastLine === '```') {
        return lines.slice(1, -1).join('\n').trim()
    }

    return input
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}
