import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { DICTIONARY_MIN_QUERY_LENGTH, DICTIONARY_SEARCH_DEBOUNCE_MS } from '@/config'
import { searchDictionary, getDictionaryEntry } from '@/services/dictionaryService'
import type { DictionaryEntry, DictionaryForm, DictionarySearchItem } from '@/types/dictionary'
import { IconChevronRight, IconSearch } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'
type FormGroupKey = 'indicative' | 'imperative' | 'perfect' | 'subjunctive'

interface FormGroup {
    key: FormGroupKey
    label: string
    forms: DictionaryForm[]
}

interface SubjunctiveFormGroup {
    label: string
    forms: DictionaryForm[]
}

interface IndicativeFormGroup {
    label: string
    forms: DictionaryForm[]
}

export const Route = createFileRoute('/dictionary')({
    component: DictionaryPage,
})

export function DictionaryPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<DictionarySearchItem[]>([])
    const [selected, setSelected] = useState<DictionarySearchItem | null>(null)
    const [entry, setEntry] = useState<DictionaryEntry | null>(null)
    const [searchState, setSearchState] = useState<LoadState>('idle')
    const [entryState, setEntryState] = useState<LoadState>('idle')
    const [entryError, setEntryError] = useState('')
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [debouncedQuery, setDebouncedQuery] = useState('')

    const trimmedQuery = query.trim()
    const trimmedDebouncedQuery = debouncedQuery.trim()

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

    const statusText = useMemo(() => {
        if (trimmedQuery.length < DICTIONARY_MIN_QUERY_LENGTH) {
            return `Type at least ${DICTIONARY_MIN_QUERY_LENGTH} letters.`
        }
        if (searchState === 'loading') return 'Searching...'
        if (searchState === 'error') return 'Dictionary search is unavailable.'
        if (searchState === 'ready' && results.length === 0) return 'No entries found.'
        return ''
    }, [results.length, searchState, trimmedQuery.length])

    const handleSelectResult = (item: DictionarySearchItem) => {
        setSelected(item)
        setEntry(null)
        setEntryError('')
        setEntryState('loading')
        setIsSheetOpen(true)
    }

    const closeSheet = () => {
        setIsSheetOpen(false)
    }

    return (
        <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-24">
            <div className="w-full max-w-5xl">
                <header className="mb-6">
                    <p className="mono-label mb-1">dictionary</p>
                    <h1 className="text-3xl font-bold">German dictionary</h1>
                </header>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
                    <section>
                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="w-full rounded-[var(--radius)] border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                                placeholder="Search lemmas or forms..."
                                aria-label="Search dictionary"
                            />
                        </div>

                        <div className="mt-3 overflow-hidden rounded-[var(--radius)] border border-border bg-card">
                            {statusText ? (
                                <p className="px-4 py-5 text-sm text-muted-foreground">{statusText}</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {results.map((item) => (
                                        <button
                                            key={`${item.id}-${item.normalized}`}
                                            onClick={() => handleSelectResult(item)}
                                            className={cn(
                                                'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg3)]',
                                                selected?.id === item.id && 'bg-[var(--accent-dim)]'
                                            )}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate text-[15px] font-semibold">
                                                    {item.matchType === 'form' ? item.lemma : item.term}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {item.matchType === 'form'
                                                        ? `matched ${item.matchedTerm ?? item.normalized} · form`
                                                        : 'lemma'}
                                                    {' · '}
                                                    {formatPos(item.pos)}
                                                    {item.article ? ` · ${item.article}` : ''}
                                                </span>
                                            </span>
                                            <IconChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="hidden min-h-[320px] rounded-[var(--radius)] border border-border bg-card p-5 lg:block">
                        <EntryPanel
                            item={selected}
                            entry={entry}
                            entryState={entryState}
                            entryError={entryError}
                        />
                    </section>
                </div>
            </div>

            <EntryBottomSheet
                isOpen={isSheetOpen}
                item={selected}
                entry={entry}
                entryState={entryState}
                entryError={entryError}
                onClose={closeSheet}
            />
        </main>
    )
}

interface EntryPanelProps {
    item: DictionarySearchItem | null
    entry: DictionaryEntry | null
    entryState: LoadState
    entryError: string
}

function EntryPanel({ item, entry, entryState, entryError }: EntryPanelProps) {
    if (entryState === 'loading') return <EntryLoading item={item} />
    if (entryState === 'error') return <EntryError item={item} message={entryError} />
    if (entryState === 'ready' && entry) return <EntryDetail entry={entry} />
    return <p className="text-sm text-muted-foreground">Select a result to view details.</p>
}

interface EntryBottomSheetProps extends EntryPanelProps {
    isOpen: boolean
    onClose: () => void
}

function EntryBottomSheet({ isOpen, item, entry, entryState, entryError, onClose }: EntryBottomSheetProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-40 lg:hidden">
            <button
                type="button"
                aria-label="Close dictionary entry"
                onClick={onClose}
                className="absolute inset-0 bg-black/35"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-label={item ? `${item.lemma} dictionary entry` : 'Dictionary entry'}
                className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-[var(--radius)] border border-border bg-card shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
                    <div className="min-w-0">
                        <p className="mono-label mb-0.5">entry</p>
                        <h2 className="truncate text-[15px] font-semibold">{item?.lemma ?? 'Dictionary entry'}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Close
                    </button>
                </div>
                <div className="max-h-[calc(85vh-64px)] overflow-y-auto p-4">
                    <EntryPanel
                        item={item}
                        entry={entry}
                        entryState={entryState}
                        entryError={entryError}
                    />
                </div>
            </section>
        </div>
    )
}

interface EntryDetailProps {
    entry: DictionaryEntry
}

function EntryDetail({ entry }: EntryDetailProps) {
    const formGroups = groupFormsByTense(entry.forms ?? [])
    const senses = entry.senses ?? []

    return (
        <div>
            <div className="mb-4">
                <p className="mono-label mb-1">{formatPos(entry.pos)}</p>
                <h2 className="text-2xl font-bold">
                    {entry.article ? `${entry.article} ` : ''}{entry.lemma}
                </h2>
            </div>

            <DetailFacts entry={entry} />

            {senses.length > 0 && (
                <section className="mt-5">
                    <p className="mono-label mb-2">meanings</p>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {senses.map((sense) => <li key={sense}>{sense}</li>)}
                    </ol>
                </section>
            )}

            {formGroups.length > 0 && (
                <section className="mt-5">
                    <p className="mono-label mb-2">forms</p>
                    <div className="space-y-3">
                        {formGroups.map((group) => (
                            <div key={group.key}>
                                <p className="mb-1 font-mono text-[11px] uppercase text-muted-foreground">
                                    {group.label}
                                </p>
                                {group.key === 'subjunctive'
                                    ? <SubjunctiveForms forms={group.forms} />
                                    : group.key === 'indicative'
                                        ? <IndicativeForms forms={group.forms} />
                                        : <FlatForms group={group} />}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {entry.etymology && (
                <section className="mt-5">
                    <p className="mono-label mb-2">etymology</p>
                    <p className="text-sm text-muted-foreground">{entry.etymology}</p>
                </section>
            )}
        </div>
    )
}

interface FlatFormsProps {
    group: FormGroup
}

function FlatForms({ group }: FlatFormsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {group.forms.map((form) => (
                <FormPill
                    key={`${group.key}-${form.form}-${form.tags.join('-')}`}
                    form={form}
                />
            ))}
        </div>
    )
}

interface SubjunctiveFormsProps {
    forms: DictionaryForm[]
}

function SubjunctiveForms({ forms }: SubjunctiveFormsProps) {
    const groups = groupSubjunctiveForms(forms)

    return (
        <div className="space-y-2">
            {groups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 text-xs font-semibold">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                        {group.forms.map((form) => (
                            <FormPill
                                key={`${group.label}-${form.form}-${form.tags.join('-')}`}
                                form={form}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

interface IndicativeFormsProps {
    forms: DictionaryForm[]
}

function IndicativeForms({ forms }: IndicativeFormsProps) {
    const groups = groupIndicativeForms(forms)

    return (
        <div className="space-y-2">
            {groups.map((group) => (
                <div key={group.label}>
                    <p className="mb-1 text-xs font-semibold">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                        {group.forms.map((form) => (
                            <FormPill
                                key={`${group.label}-${form.form}-${form.tags.join('-')}`}
                                form={form}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

interface DetailFactsProps {
    entry: DictionaryEntry
}

function DetailFacts({ entry }: DetailFactsProps) {
    const details = entry.details ?? {}
    const pastParticiplePrefix = getPastParticiplePrefix(entry.forms ?? [])
    const facts = [
        { label: 'Gender', value: details.gender },
        { label: 'Genitive', value: details.genitive },
        { label: 'Plural', value: details.plural },
        { label: 'Auxiliary', value: details.auxiliary },
        {
            label: 'Past participle',
            value: details.pastParticiple,
            prefix: pastParticiplePrefix,
        },
        { label: 'Comparative', value: details.comparative },
        { label: 'Superlative', value: details.superlative },
    ].filter((fact) => Boolean(fact.value))

    if (facts.length === 0) return null

    return (
        <dl className="grid gap-2 sm:grid-cols-2">
            {facts.map((fact) => (
                <div key={fact.label} className="rounded-[var(--radius-sm)] border border-border px-3 py-2">
                    <dt className="font-mono text-[11px] uppercase text-muted-foreground">{fact.label}</dt>
                    <dd className="text-sm font-medium">
                        {fact.prefix && <span className="italic">{fact.prefix} </span>}
                        {fact.value}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

interface EntryStateProps {
    item: DictionarySearchItem | null
    message?: string
}

function EntryLoading({ item }: EntryStateProps) {
    return (
        <div>
            <p className="text-sm text-muted-foreground">Loading entry...</p>
            {item && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {item.lemma} · entries/{item.entryBucket}.json
                </p>
            )}
        </div>
    )
}

function EntryError({ item, message }: EntryStateProps) {
    return (
        <div className="rounded-[var(--radius)] border border-[var(--incorrect)] bg-[var(--incorrect-bg)] p-3">
            <p className="text-sm font-semibold text-[var(--incorrect)]">Entry data could not be loaded.</p>
            {item && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {item.lemma} · {item.id} · entries/{item.entryBucket}.json
                </p>
            )}
            {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
        </div>
    )
}

interface FormPillProps {
    form: DictionaryForm
}

function FormPill({ form }: FormPillProps) {
    const subject = getSubjectForTags(form.tags)

    return (
        <span className="rounded-full border border-border px-3 py-1 text-xs">
            <span className="font-semibold">
                {subject && <span className="italic">{subject} </span>}
                {form.form}
            </span>
            {form.tags.length > 0 && (
                <span className="text-muted-foreground"> · {form.tags.join(', ')}</span>
            )}
        </span>
    )
}

function getSubjectForTags(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('first-person') && hasTag('singular')) return 'ich'
    if (hasTag('second-person') && hasTag('singular')) return 'du'
    if (hasTag('third-person') && hasTag('singular')) return 'er'
    if (hasTag('first-person') && hasTag('plural')) return 'wir'
    if (hasTag('second-person') && hasTag('plural')) return 'ihr'
    if (hasTag('third-person') && hasTag('plural')) return 'sie'
    return ''
}

function getPastParticiplePrefix(forms: DictionaryForm[]) {
    const auxiliary = forms.find((form) =>
        form.tags.some((tag) => tag.toLowerCase() === 'auxiliary')
    )?.form.toLowerCase()

    if (auxiliary === 'haben') return 'hat'
    if (auxiliary === 'sein') return 'ist'
    return ''
}

function groupIndicativeForms(forms: DictionaryForm[]): IndicativeFormGroup[] {
    const groups = new Map<string, DictionaryForm[]>()

    for (const form of forms) {
        const label = getIndicativeSubcategory(form.tags)
        if (!label) continue
        groups.set(label, [...(groups.get(label) ?? []), form])
    }

    return [
        'Present',
        'Past',
        'Perfect',
        'Pluperfect',
        'Future I',
        'Future II',
    ].flatMap((label) => {
        const groupForms = groups.get(label)
        return groupForms ? [{ label, forms: groupForms }] : []
    })
}

function getIndicativeSubcategory(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('future-ii')) return 'Future II'
    if (hasTag('future-i')) return 'Future I'
    if (hasTag('pluperfect')) return 'Pluperfect'
    if (hasTag('perfect')) return 'Perfect'
    if (hasTag('preterite')) return 'Past'
    if (hasTag('present')) return 'Present'
    return ''
}

function groupSubjunctiveForms(forms: DictionaryForm[]): SubjunctiveFormGroup[] {
    const groups = new Map<string, DictionaryForm[]>()

    for (const form of forms) {
        const label = getSubjunctiveSubcategory(form.tags)
        if (!label) continue
        groups.set(label, [...(groups.get(label) ?? []), form])
    }

    return [
        'Subjunctive I',
        'Subjunctive II',
        'Perfect',
        'Pluperfect',
        'Future I',
        'Future II',
        'Präteritum (würde)',
        'Pluperfect (würde)',
    ].flatMap((label) => {
        const groupForms = groups.get(label)
        return groupForms ? [{ label, forms: groupForms }] : []
    })
}

function getSubjunctiveSubcategory(tags: string[]) {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    const hasTag = (value: string) => normalizedTags.includes(value)

    if (hasTag('future-ii') && hasTag('subjunctive-ii')) return 'Pluperfect (würde)'
    if (hasTag('future-i') && hasTag('subjunctive-ii')) return 'Präteritum (würde)'
    if (hasTag('future-ii') && hasTag('subjunctive-i')) return 'Future II'
    if (hasTag('future-i') && hasTag('subjunctive-i')) return 'Future I'
    if (hasTag('pluperfect')) return 'Pluperfect'
    if (hasTag('perfect')) return 'Perfect'
    if (hasTag('subjunctive-ii')) return 'Subjunctive II'
    if (hasTag('subjunctive-i')) return 'Subjunctive I'
    return ''
}

function groupFormsByTense(forms: DictionaryForm[]): FormGroup[] {
    const groups: Record<FormGroupKey, DictionaryForm[]> = {
        indicative: [],
        imperative: [],
        perfect: [],
        subjunctive: [],
    }

    for (const form of forms) {
        const groupKey = getFormGroupKey(form.tags)
        if (groupKey) groups[groupKey].push(form)
    }

    const orderedGroups: FormGroup[] = [
        { key: 'indicative', label: 'Indicative', forms: groups.indicative },
        { key: 'imperative', label: 'Imperative', forms: groups.imperative },
        { key: 'perfect', label: 'Perfect', forms: groups.perfect },
        { key: 'subjunctive', label: 'Subjunctive', forms: groups.subjunctive },
    ]
    return orderedGroups.filter((group) => group.forms.length > 0)
}

function getFormGroupKey(tags: string[]): FormGroupKey | '' {
    const normalizedTags = tags.map((tag) => tag.toLowerCase())
    if (normalizedTags.some((tag) => tag.includes('subjunctive') || tag === 'konjunktiv')) {
        return 'subjunctive'
    }
    if (normalizedTags.includes('indicative')) {
        return 'indicative'
    }
    if (normalizedTags.includes('imperative')) {
        return 'imperative'
    }
    if (normalizedTags.some((tag) => tag.includes('perfect') || tag === 'perfekt')) {
        return 'perfect'
    }
    return ''
}

function formatPos(pos: string) {
    return pos.replace('-', ' ')
}
