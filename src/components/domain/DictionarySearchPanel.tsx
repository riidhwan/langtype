import { Input } from '@/components/ui/Input'
import { IconChevronRight, IconSearch } from '@/components/ui/icons'
import { formatDictionaryPartOfSpeech } from '@/lib/dictionaryForms'
import { cn } from '@/lib/utils'
import type { DictionarySearchItem } from '@/types/dictionary'

interface Props {
    query: string
    results: DictionarySearchItem[]
    selected: DictionarySearchItem | null
    statusText: string
    onQueryChange: (value: string) => void
    onSelectResult: (item: DictionarySearchItem) => void
}

export function DictionarySearchPanel({
    query,
    results,
    selected,
    statusText,
    onQueryChange,
    onSelectResult,
}: Props) {
    return (
        <section>
            <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    className="pl-9"
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
                                onClick={() => onSelectResult(item)}
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
                                        {formatDictionaryPartOfSpeech(item.pos)}
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
    )
}
