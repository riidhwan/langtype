export type DictionaryPartOfSpeech =
    | 'noun'
    | 'verb'
    | 'adj'
    | 'adv'
    | 'proper-noun'
    | 'phrase'
    | 'other'

export type DictionaryMatchType = 'lemma' | 'form'

export interface DictionaryForm {
    form: string
    tags: string[]
}

export interface DictionaryEntryDetails {
    gender?: string
    genitive?: string
    plural?: string
    auxiliary?: string
    pastParticiple?: string
    comparative?: string
    superlative?: string
}

export interface DictionaryEntry {
    id: string
    lemma: string
    normalized: string
    pos: DictionaryPartOfSpeech
    article?: string
    senses: string[]
    forms: DictionaryForm[]
    details: DictionaryEntryDetails
    sounds: string[]
    etymology?: string
}

export interface DictionarySearchItem {
    id: string
    term: string
    matchedTerm?: string
    normalized: string
    lemma: string
    pos: DictionaryPartOfSpeech
    article?: string
    matchType: DictionaryMatchType
    rank: number
    entryBucket: string
}

export interface DictionaryEntryChunk {
    entries: Record<string, DictionaryEntry>
}

export type DictionarySearchIndex = Record<string, string[]>

export interface DictionaryManifest {
    version: string
    prefixLength: number
    entryBucketCount: number
    searchShardCount: number
    generatedAt: string
    searchPath: string
    searchIndexPath: string
    entriesPath: string
    buildStatsPath: string
}
