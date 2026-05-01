import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'

vi.mock('@/config', () => ({
    DICTIONARY_MIN_QUERY_LENGTH: 2,
    DICTIONARY_SEARCH_DEBOUNCE_MS: 0,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        createFileRoute: () => () => ({}),
    }
})

const mockSearchDictionary = vi.hoisted(() => vi.fn())
const mockGetDictionaryEntry = vi.hoisted(() => vi.fn())

vi.mock('@/services/dictionaryService', () => ({
    searchDictionary: mockSearchDictionary,
    getDictionaryEntry: mockGetDictionaryEntry,
}))

import { DictionaryPage } from '../dictionary'

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
    forms: [
        { form: 'arbeite', tags: ['present', 'first-person', 'singular'] },
        { form: 'gearbeitet', tags: ['participle', 'past'] },
        { form: 'werde arbeiten', tags: ['future-i'] },
        { form: 'werde gearbeitet haben', tags: ['future-ii'] },
        { form: 'habe gearbeitet', tags: ['perfect'] },
        { form: 'haben', tags: ['auxiliary'] },
        { form: 'arbeite-imp', tags: ['imperative'] },
        { form: 'arbeite-ind', tags: ['indicative', 'present', 'first-person', 'singular'] },
        { form: 'arbeitete-ind', tags: ['indicative', 'preterite'] },
        { form: 'habe-gearbeitet-ind', tags: ['indicative', 'perfect'] },
        { form: 'hatte-gearbeitet-ind', tags: ['indicative', 'pluperfect'] },
        { form: 'werde-arbeiten-ind', tags: ['indicative', 'future-i'] },
        { form: 'werde-gearbeitet-haben-ind', tags: ['indicative', 'future-ii'] },
        { form: 'arbeite-sub-i', tags: ['subjunctive', 'subjunctive-i'] },
        { form: 'arbeitete-sub-ii', tags: ['subjunctive', 'subjunctive-ii'] },
        { form: 'habe-gearbeitet-sub', tags: ['subjunctive', 'perfect'] },
        { form: 'haette-gearbeitet-sub', tags: ['subjunctive', 'pluperfect'] },
        { form: 'werde-arbeiten-sub-i', tags: ['subjunctive', 'future-i', 'subjunctive-i'] },
        { form: 'werde-gearbeitet-haben-sub-i', tags: ['subjunctive', 'future-ii', 'subjunctive-i'] },
        { form: 'wuerde-arbeiten-sub-ii', tags: ['subjunctive', 'future-i', 'subjunctive-ii'] },
        { form: 'wuerde-gearbeitet-haben-sub-ii', tags: ['subjunctive', 'future-ii', 'subjunctive-ii'] },
        { form: 'arbeitend', tags: ['participle'] },
    ],
    details: { pastParticiple: 'gearbeitet' },
    sounds: [],
}

describe('DictionaryPage', () => {
    beforeEach(() => {
        mockSearchDictionary.mockReset()
        mockGetDictionaryEntry.mockReset()
        mockSearchDictionary.mockResolvedValue([searchItem])
        mockGetDictionaryEntry.mockResolvedValue(entry)
    })

    it('searches by form and renders verb details', async () => {
        let resolveEntry: (value: DictionaryEntry) => void = () => {}
        mockGetDictionaryEntry.mockReturnValueOnce(new Promise((resolve) => {
            resolveEntry = resolve
        }))
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'gear' },
        })

        expect(await screen.findByText('arbeiten')).toBeInTheDocument()
        expect(screen.getByText('matched gearbeitet · form · verb')).toBeInTheDocument()
        fireEvent.click(screen.getByText('arbeiten'))

        expect(screen.getAllByText('Loading entry...').length).toBeGreaterThan(0)
        await waitFor(() => expect(mockGetDictionaryEntry).toHaveBeenCalledWith(searchItem))
        resolveEntry(entry)
        expect(await screen.findAllByText('arbeiten')).not.toHaveLength(0)
        expect(screen.getAllByText('Past participle').length).toBeGreaterThan(0)
        const pastParticiplePrefixes = screen.getAllByText('hat')
        expect(pastParticiplePrefixes.length).toBeGreaterThan(0)
        expect(pastParticiplePrefixes[0]).toHaveClass('italic')
        expect(screen.getAllByText('Perfect').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Indicative').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Imperative').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Present').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Past').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Future I').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Future II').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Subjunctive').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Subjunctive I').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Subjunctive II').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Pluperfect').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Präteritum (würde)').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Pluperfect (würde)').length).toBeGreaterThan(0)
        const subjectPrefixes = screen.getAllByText('ich')
        expect(subjectPrefixes.length).toBeGreaterThan(0)
        expect(subjectPrefixes[0]).toHaveClass('italic')
        expect(screen.getAllByText('gearbeitet').length).toBeGreaterThan(0)
        expect(screen.getAllByText('habe gearbeitet').length).toBeGreaterThan(0)
        expect(screen.getAllByText('arbeite-imp').length).toBeGreaterThan(0)
        expect(screen.getAllByText('arbeite-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('arbeitete-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('habe-gearbeitet-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('hatte-gearbeitet-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('werde-arbeiten-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('werde-gearbeitet-haben-ind').length).toBeGreaterThan(0)
        expect(screen.getAllByText('arbeite-sub-i').length).toBeGreaterThan(0)
        expect(screen.getAllByText('arbeitete-sub-ii').length).toBeGreaterThan(0)
        expect(screen.getAllByText('habe-gearbeitet-sub').length).toBeGreaterThan(0)
        expect(screen.getAllByText('haette-gearbeitet-sub').length).toBeGreaterThan(0)
        expect(screen.getAllByText('werde-arbeiten-sub-i').length).toBeGreaterThan(0)
        expect(screen.getAllByText('werde-gearbeitet-haben-sub-i').length).toBeGreaterThan(0)
        expect(screen.getAllByText('wuerde-arbeiten-sub-ii').length).toBeGreaterThan(0)
        expect(screen.getAllByText('wuerde-gearbeitet-haben-sub-ii').length).toBeGreaterThan(0)
        expect(screen.queryByText('arbeite')).not.toBeInTheDocument()
        expect(screen.queryByText('werde arbeiten')).not.toBeInTheDocument()
        expect(screen.queryByText('werde gearbeitet haben')).not.toBeInTheDocument()
        expect(screen.queryByText('arbeitend')).not.toBeInTheDocument()
    })

    it('uses the lemma as the result title for form matches', async () => {
        mockSearchDictionary.mockResolvedValueOnce([{
            ...searchItem,
            term: 'gearbeitet',
            matchedTerm: undefined,
        }])
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'gear' },
        })

        expect(await screen.findByText('arbeiten')).toBeInTheDocument()
        expect(screen.queryByText('gearbeitet')).not.toBeInTheDocument()
        expect(screen.getByText('matched gearbeitet · form · verb')).toBeInTheDocument()
    })

    it('shows empty and error states', async () => {
        mockSearchDictionary.mockResolvedValueOnce([])
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'zz' },
        })

        expect(await screen.findByText('No entries found.')).toBeInTheDocument()
    })

    it('renders search failures gracefully', async () => {
        mockSearchDictionary.mockRejectedValueOnce(new Error('offline'))
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'arb' },
        })

        expect(await screen.findByText('Dictionary search is unavailable.')).toBeInTheDocument()
    })

    it('shows diagnostics when selected entry loading fails', async () => {
        mockGetDictionaryEntry.mockRejectedValueOnce(new Error('Dictionary request failed: 404'))
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'gear' },
        })

        fireEvent.click(await screen.findByText('arbeiten'))

        await screen.findAllByText('Entry data could not be loaded.')
        expect(screen.getAllByText(/entries\/0001\.json/).length).toBeGreaterThan(0)
        expect(screen.getAllByText('Dictionary request failed: 404').length).toBeGreaterThan(0)
    })

    it('opens and closes a bottom sheet after selecting a result', async () => {
        render(<DictionaryPage />)

        fireEvent.change(screen.getByLabelText('Search dictionary'), {
            target: { value: 'gear' },
        })
        fireEvent.click(await screen.findByText('arbeiten'))

        const dialog = screen.getByRole('dialog', { name: 'arbeiten dictionary entry' })
        expect(dialog).toBeInTheDocument()
        expect(await within(dialog).findByText('arbeiten')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Close' }))

        expect(screen.queryByRole('dialog', { name: 'arbeiten dictionary entry' })).not.toBeInTheDocument()
    })
})
