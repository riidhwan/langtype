import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Challenge } from '@/types/challenge'
import {
    CustomCollection,
    isValidCustomCollection,
    makeChallengeId,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'
import { useSRSStore } from '@/store/useSRSStore'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

interface Props {
    collection: CustomCollection
}

export function CollectionEditor({ collection }: Props) {
    const navigate = useNavigate()
    const [tagInput, setTagInput] = useState('')
    const upsertCollection = useCustomCollectionsStore((s) => s.upsertCollection)
    const deleteCollection = useCustomCollectionsStore((s) => s.deleteCollection)
    const resetCollection = useSRSStore((s) => s.resetCollection)

    const isPlayable = isValidCustomCollection(collection)
    const validChallengeCount = (collection.challenges ?? []).filter((challenge) => challenge.translation.trim()).length

    const updateCollection = (updates: Partial<CustomCollection>) => {
        upsertCollection({ ...collection, ...updates })
    }

    const updateChallenge = (id: string, updates: Partial<Challenge>) => {
        updateCollection({
            challenges: (collection.challenges ?? []).map((challenge) => (
                challenge.id === id ? { ...challenge, ...updates } : challenge
            )),
        })
    }

    const updateTags = (tags: string[]) => {
        const seen = new Set<string>()
        updateCollection({
            tags: tags
                .map((tag) => tag.trim())
                .filter(Boolean)
                .filter((tag) => {
                    const key = tag.toLowerCase()
                    if (seen.has(key)) return false
                    seen.add(key)
                    return true
                }),
        })
    }

    const addTags = (value: string) => {
        const nextTags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)

        if (nextTags.length === 0) return
        updateTags([...(collection.tags ?? []), ...nextTags])
        setTagInput('')
    }

    const removeTag = (tagToRemove: string) => {
        updateTags((collection.tags ?? []).filter((tag) => tag !== tagToRemove))
    }

    const addChallenge = () => {
        updateCollection({
            challenges: [
                ...(collection.challenges ?? []),
                { id: makeChallengeId(), original: '', translation: '' },
            ],
        })
    }

    const removeChallenge = (id: string) => {
        if (!window.confirm('Delete this challenge?')) return
        updateCollection({
            challenges: (collection.challenges ?? []).filter((challenge) => challenge.id !== id),
        })
    }

    const moveChallenge = (index: number, direction: -1 | 1) => {
        const challenges = [...(collection.challenges ?? [])]
        const nextIndex = index + direction
        if (nextIndex < 0 || nextIndex >= challenges.length) return
        const current = challenges[index]
        challenges[index] = challenges[nextIndex]
        challenges[nextIndex] = current
        updateCollection({ challenges })
    }

    const handleDeleteCollection = () => {
        if (!window.confirm('Delete this custom collection and its progress?')) return
        deleteCollection(collection.id)
        resetCollection(collection.id)
        navigate({ to: '/' })
    }

    return (
        <main className="min-h-screen bg-background px-4 py-6 md:px-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                            Home
                        </Link>
                        <h1 className="mt-3 text-2xl font-bold">Custom collection</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isPlayable
                                ? `${validChallengeCount} ${validChallengeCount === 1 ? 'challenge' : 'challenges'} ready`
                                : 'Draft saved locally. Add a title and at least one answer to practice.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/collections/$id"
                            params={{ id: collection.id }}
                            disabled={!isPlayable}
                            className={cn(
                                'rounded-[var(--radius)] border px-3 py-2 text-sm font-medium transition-colors',
                                isPlayable
                                    ? 'border-primary bg-primary text-primary-foreground hover:opacity-90'
                                    : 'pointer-events-none border-border text-muted-foreground opacity-45',
                            )}
                        >
                            Practice
                        </Link>
                        <button
                            onClick={handleDeleteCollection}
                            className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium text-[var(--incorrect)] transition-colors hover:bg-[var(--bg2)]"
                        >
                            Delete
                        </button>
                    </div>
                </header>

                <section className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <label className="flex flex-col gap-1">
                        <span className="mono-label">title</span>
                        <input
                            value={collection.title}
                            onChange={(event) => updateCollection({ title: event.target.value })}
                            className="rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            placeholder="German A1 review"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="mono-label">mode</span>
                        <select
                            value={collection.freeInput ? 'free' : 'slots'}
                            onChange={(event) => updateCollection({ freeInput: event.target.value === 'free' })}
                            className="rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        >
                            <option value="free">Free input</option>
                            <option value="slots">Slot input</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="mono-label">description</span>
                        <textarea
                            value={collection.description ?? ''}
                            onChange={(event) => updateCollection({ description: event.target.value })}
                            className="min-h-20 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            placeholder="Short note about what this collection practices"
                        />
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="mono-label">tags</span>
                        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-2 py-1 focus-within:border-primary">
                            {(collection.tags ?? []).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-mono"
                                >
                                    <span className="truncate">{tag}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        title={`Remove ${tag}`}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
                            <input
                                value={tagInput}
                                onChange={(event) => {
                                    const value = event.target.value
                                    if (value.includes(',')) {
                                        addTags(value)
                                    } else {
                                        setTagInput(value)
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ',') {
                                        event.preventDefault()
                                        addTags(tagInput)
                                    }
                                }}
                                onBlur={() => addTags(tagInput)}
                                className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none"
                                placeholder={(collection.tags ?? []).length === 0 ? 'Custom, A1, verbs' : 'Add tag'}
                            />
                        </div>
                    </label>
                </section>

                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">Challenges</h2>
                        <button
                            onClick={addChallenge}
                            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-[var(--bg2)]"
                        >
                            <IconPlus className="h-4 w-4" />
                            Add
                        </button>
                    </div>

                    {(collection.challenges ?? []).length === 0 ? (
                        <div className="rounded-[var(--radius)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                            No challenges yet.
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
                            {(collection.challenges ?? []).map((challenge, index) => (
                                <div key={challenge.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
                                    <label className="flex flex-col gap-1">
                                        <span className="mono-label">prompt</span>
                                        <textarea
                                            value={challenge.original ?? ''}
                                            onChange={(event) => updateChallenge(challenge.id, { original: event.target.value })}
                                            className="min-h-20 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                            placeholder="Optional source text"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="mono-label">answer</span>
                                        <textarea
                                            value={challenge.translation}
                                            onChange={(event) => updateChallenge(challenge.id, { translation: event.target.value })}
                                            className="min-h-20 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                            placeholder="Required answer"
                                        />
                                    </label>
                                    <div className="flex gap-2 md:flex-col">
                                        <button
                                            onClick={() => moveChallenge(index, -1)}
                                            disabled={index === 0}
                                            title="Move up"
                                            className="rounded-[var(--radius)] border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                                        >
                                            <IconArrowUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => moveChallenge(index, 1)}
                                            disabled={index === (collection.challenges ?? []).length - 1}
                                            title="Move down"
                                            className="rounded-[var(--radius)] border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                                        >
                                            <IconArrowDown className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => removeChallenge(challenge.id)}
                                            title="Delete challenge"
                                            className="rounded-[var(--radius)] border border-border p-2 text-[var(--incorrect)] transition-colors hover:bg-[var(--bg2)]"
                                        >
                                            <IconTrash className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
