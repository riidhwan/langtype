import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'
import { useDictionarySearch } from '../useDictionarySearch'

vi.mock('@/config', () => ({
    DICTIONARY_MIN_QUERY_LENGTH: 2,
    DICTIONARY_SEARCH_DEBOUNCE_MS: 25,
}))

const mockSearchDictionary = vi.hoisted(() => vi.fn())
const mockGetDictionaryEntry = vi.hoisted(() => vi.fn())

vi.mock('@/services/dictionaryService', () => ({
    searchDictionary: mockSearchDictionary,
    getDictionaryEntry: mockGetDictionaryEntry,
}))

const searchItem: DictionarySearchItem = {
    id: 'arbeiten-id',
    term: 'arbeiten',
    matchedTerm: 'gearbeitet',
    normalized: 'gearbeitet',
    lemma: 'arbeiten',
    pos: 'verb',
    matchType: 'form',
    rank: 10,
    entryBucket: '0001',
}

const entry: DictionaryEntry = {
    id: 'arbeiten-id',
    lemma: 'arbeiten',
    normalized: 'arbeiten',
    pos: 'verb',
    senses: ['to work'],
    forms: [],
    details: {},
    sounds: [],
}

describe('useDictionarySearch', () => {
    beforeEach(() => {
        mockSearchDictionary.mockReset()
        mockGetDictionaryEntry.mockReset()
        mockSearchDictionary.mockResolvedValue([searchItem])
        mockGetDictionaryEntry.mockResolvedValue(entry)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('waits for the minimum query length before searching', async () => {
        vi.useFakeTimers()
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.setQuery('a'))
        await act(async () => {
            vi.advanceTimersByTime(25)
            await Promise.resolve()
        })

        expect(mockSearchDictionary).not.toHaveBeenCalled()
        expect(result.current.statusText).toBe('Type at least 2 letters.')
        expect(result.current.results).toEqual([])
    })

    it('debounces search and publishes ready results', async () => {
        vi.useFakeTimers()
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.setQuery('ar'))

        expect(result.current.searchState).toBe('loading')
        expect(mockSearchDictionary).not.toHaveBeenCalled()

        await act(async () => {
            vi.advanceTimersByTime(25)
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(mockSearchDictionary).toHaveBeenCalledWith('ar')
        expect(result.current.searchState).toBe('ready')
        expect(result.current.results).toEqual([searchItem])
        expect(result.current.statusText).toBe('')
    })

    it('ignores stale search responses after the query changes', async () => {
        vi.useFakeTimers()
        let resolveFirst: (value: DictionarySearchItem[]) => void = () => {}
        mockSearchDictionary
            .mockReturnValueOnce(new Promise<DictionarySearchItem[]>((resolve) => {
                resolveFirst = resolve
            }))
            .mockResolvedValueOnce([{ ...searchItem, id: 'abend-id', lemma: 'Abend' }])

        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.setQuery('ar'))
        await act(async () => {
            vi.advanceTimersByTime(25)
            await Promise.resolve()
        })
        expect(mockSearchDictionary).toHaveBeenCalledWith('ar')

        act(() => result.current.setQuery('ab'))
        await act(async () => {
            vi.advanceTimersByTime(25)
            await Promise.resolve()
            await Promise.resolve()
        })
        expect(mockSearchDictionary).toHaveBeenCalledWith('ab')

        await act(async () => {
            resolveFirst([searchItem])
            await Promise.resolve()
        })

        expect(result.current.results[0]?.lemma).toBe('Abend')
    })

    it('reports search errors and clears results', async () => {
        vi.useFakeTimers()
        mockSearchDictionary.mockRejectedValueOnce(new Error('offline'))
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.setQuery('ar'))
        await act(async () => {
            vi.advanceTimersByTime(25)
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(result.current.searchState).toBe('error')
        expect(result.current.results).toEqual([])
        expect(result.current.statusText).toBe('Dictionary search is unavailable.')
    })

    it('loads selected entries and opens the mobile sheet', async () => {
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.selectResult(searchItem))

        expect(result.current.isSheetOpen).toBe(true)
        expect(result.current.entryState).toBe('loading')
        await waitFor(() => expect(result.current.entryState).toBe('ready'))
        expect(mockGetDictionaryEntry).toHaveBeenCalledWith(searchItem)
        expect(result.current.entry).toEqual(entry)

        act(() => result.current.closeSheet())

        expect(result.current.isSheetOpen).toBe(false)
    })

    it('reports missing entry diagnostics', async () => {
        mockGetDictionaryEntry.mockResolvedValueOnce(null)
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.selectResult(searchItem))

        await waitFor(() => expect(result.current.entryState).toBe('error'))
        expect(result.current.entryError).toBe('No entry arbeiten-id in entries/0001.json.')
    })

    it('reports entry request errors', async () => {
        mockGetDictionaryEntry.mockRejectedValueOnce(new Error('Dictionary request failed: 404'))
        const { result } = renderHook(() => useDictionarySearch())

        act(() => result.current.selectResult(searchItem))

        await waitFor(() => expect(result.current.entryState).toBe('error'))
        expect(result.current.entry).toBeNull()
        expect(result.current.entryError).toBe('Dictionary request failed: 404')
    })
})
