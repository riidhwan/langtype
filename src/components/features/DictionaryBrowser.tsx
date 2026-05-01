import { DictionaryEntryBottomSheet } from '@/components/domain/DictionaryEntryBottomSheet'
import { DictionaryEntryPanel } from '@/components/domain/DictionaryEntryPanel'
import { DictionarySearchPanel } from '@/components/domain/DictionarySearchPanel'
import { useDictionarySearch } from '@/hooks/useDictionarySearch'

export function DictionaryBrowser() {
    const dictionary = useDictionarySearch()

    return (
        <main className="flex min-h-screen flex-col items-center bg-background p-4 md:p-24">
            <div className="w-full max-w-5xl">
                <header className="mb-6">
                    <p className="mono-label mb-1">dictionary</p>
                    <h1 className="text-3xl font-bold">German dictionary</h1>
                </header>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
                    <DictionarySearchPanel
                        query={dictionary.query}
                        results={dictionary.results}
                        selected={dictionary.selected}
                        statusText={dictionary.statusText}
                        onQueryChange={dictionary.setQuery}
                        onSelectResult={dictionary.selectResult}
                    />

                    <section className="hidden min-h-[320px] rounded-[var(--radius)] border border-border bg-card p-5 lg:block">
                        <DictionaryEntryPanel
                            item={dictionary.selected}
                            entry={dictionary.entry}
                            entryState={dictionary.entryState}
                            entryError={dictionary.entryError}
                        />
                    </section>
                </div>
            </div>

            <DictionaryEntryBottomSheet
                isOpen={dictionary.isSheetOpen}
                item={dictionary.selected}
                entry={dictionary.entry}
                entryState={dictionary.entryState}
                entryError={dictionary.entryError}
                onClose={dictionary.closeSheet}
            />
        </main>
    )
}
