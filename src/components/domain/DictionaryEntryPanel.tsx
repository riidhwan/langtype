import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'
import type { DictionaryLoadState } from '@/hooks/useDictionarySearch'
import { DictionaryEntryDetail } from './DictionaryEntryDetail'

interface Props {
    item: DictionarySearchItem | null
    entry: DictionaryEntry | null
    entryState: DictionaryLoadState
    entryError: string
}

export function DictionaryEntryPanel({ item, entry, entryState, entryError }: Props) {
    if (entryState === 'loading') return <EntryLoading item={item} />
    if (entryState === 'error') return <EntryError item={item} message={entryError} />
    if (entryState === 'ready' && entry) return <DictionaryEntryDetail entry={entry} />
    return <p className="text-sm text-muted-foreground">Select a result to view details.</p>
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
