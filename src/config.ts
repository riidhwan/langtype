export const DEFAULT_HOME_TAG = 'Netzwerk Neu'

// How far ahead (in queue positions) a missed/ASAP card is reinserted.
// Card appears at a random offset in [REINSERT_MIN, REINSERT_MAX] after the current index.
export const REINSERT_MIN = 2
export const REINSERT_MAX = 10

export const DICTIONARY_PUBLIC_BASE_URL =
    import.meta.env.VITE_DICTIONARY_PUBLIC_BASE_URL ?? 'https://r2-langtype.ramdhani.me'
export const DICTIONARY_ACTIVE_VERSION =
    import.meta.env.VITE_DICTIONARY_ACTIVE_VERSION ?? 'v2026-05-01'
export const DICTIONARY_MIN_QUERY_LENGTH = 3
export const DICTIONARY_SEARCH_DEBOUNCE_MS = 300
export const DICTIONARY_RESULT_LIMIT = 30
export const DICTIONARY_PREFIX_LENGTH = 3
