import type { DictionaryEntry, DictionarySearchItem } from '@/types/dictionary'
import type { DictionaryLoadState } from '@/hooks/useDictionarySearch'
import { Button } from '@/components/ui/Button'
import { DictionaryEntryPanel } from './DictionaryEntryPanel'

interface Props {
    isOpen: boolean
    item: DictionarySearchItem | null
    entry: DictionaryEntry | null
    entryState: DictionaryLoadState
    entryError: string
    onClose: () => void
}

export function DictionaryEntryBottomSheet({
    isOpen,
    item,
    entry,
    entryState,
    entryError,
    onClose,
}: Props) {
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
                    <Button
                        onClick={onClose}
                        className="rounded-[var(--radius-sm)] px-3 py-1 text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </Button>
                </div>
                <div className="max-h-[calc(85vh-64px)] overflow-y-auto p-4">
                    <DictionaryEntryPanel
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
