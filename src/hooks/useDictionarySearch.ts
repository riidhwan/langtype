import { useEffect, useMemo, useState } from 'react'
import { DICTIONARY_MIN_QUERY_LENGTH, DICTIONARY_SEARCH_DEBOUNCE_MS } from '@/config'
import { getDictionaryEntry, searchDictionary } from '@/services/dictionaryService'
import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'

export type DictionaryLoadState = 'idle' | 'loading' | 'ready' | 'error'

export function useDictionarySearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<DictionarySearchItem[]>([])
    const [selected, setSelected] = useState<DictionarySearchItem | null>(null)
    const [entry, setEntry] = useState<DictionaryEntry | null>(null)
    const [searchState, setSearchState] = useState<DictionaryLoadState>('idle')
    const [entryState, setEntryState] = useState<DictionaryLoadState>('idle')
    const [entryError, setEntryError] = useState('')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [debouncedQuery, setDebouncedQuery] = useState('')

    const trimmedQuery = query.trim()
    const trimmedDebouncedQuery = debouncedQuery.trim()

    const statusText = useMemo(() => {
        if (trimmedQuery.length < DICTIONARY_MIN_QUERY_LENGTH) {
            return `Type at least ${DICTIONARY_MIN_QUERY_LENGTH} letters.`
        }
        if (searchState === 'loading') return 'Searching...'
        if (searchState === 'error') return 'Dictionary search is unavailable.'
        if (searchState === 'ready' && results.length === 0) return 'No entries found.'
        return ''
    }, [results.length, searchState, trimmedQuery.length])

    useEffect(() => {
        if (DICTIONARY_SEARCH_DEBOUNCE_MS <= 0) {
            setDebouncedQuery(trimmedQuery)
            return
        }

        if (trimmedQuery.length >= DICTIONARY_MIN_QUERY_LENGTH) {
            setSearchState('loading')
        }

        const timer = window.setTimeout(() => {
            setDebouncedQuery(trimmedQuery)
        }, DICTIONARY_SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timer)
    }, [trimmedQuery])

    useEffect(() => {
        if (trimmedDebouncedQuery.length < DICTIONARY_MIN_QUERY_LENGTH) {
            setResults([])
            setSelected(null)
            setEntry(null)
            setEntryError('')
            setSearchState('idle')
            return
        }

        let active = true
        setSelected(null)
        setEntry(null)
        setEntryError('')
        setSearchState('loading')
        searchDictionary(trimmedDebouncedQuery)
            .then((items) => {
                if (!active) return
                setResults(items)
                setSearchState('ready')
            })
            .catch(() => {
                if (!active) return
                setResults([])
                setSearchState('error')
            })

        return () => { active = false }
    }, [trimmedDebouncedQuery])

    useEffect(() => {
        if (!selected) {
            setEntry(null)
            setEntryError('')
            setEntryState('idle')
            return
        }

        let active = true
        setEntryState('loading')
        setEntryError('')
        getDictionaryEntry(selected)
            .then((loadedEntry) => {
                if (!active) return
                setEntry(loadedEntry)
                if (loadedEntry) {
                    setEntryState('ready')
                    return
                }
                setEntryError(`No entry ${selected.id} in entries/${selected.entryBucket}.json.`)
                setEntryState('error')
            })
            .catch((error: unknown) => {
                if (!active) return
                setEntry(null)
                setEntryError(error instanceof Error ? error.message : 'Entry request failed.')
                setEntryState('error')
            })

        return () => { active = false }
    }, [selected])

    const selectResult = (item: DictionarySearchItem) => {
        setSelected(item)
        setEntry(null)
        setEntryError('')
        setEntryState('loading')
        setIsSheetOpen(true)
    }

    const closeSheet = () => {
        setIsSheetOpen(false)
    }

    return {
        query,
        setQuery,
        results,
        selected,
        entry,
        searchState,
        entryState,
        entryError,
        isSheetOpen,
        statusText,
        selectResult,
        closeSheet,
    }
}
