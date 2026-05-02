import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Challenge } from '@/types/challenge'
import {
    CustomCollection,
    isValidCustomCollection,
    makeChallengeId,
    useCustomCollectionsStore,
} from '@/store/useCustomCollectionsStore'
import { useSRSStore } from '@/store/useSRSStore'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/ConfirmButton'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@/components/ui/icons'
import { buildAiChatImportPrompt, parseAiChatImportJson } from '@/lib/aiChatImport'
import { cn } from '@/lib/utils'

interface Props {
    collection: CustomCollection
}

export function CollectionEditor({ collection }: Props) {
    const navigate = useNavigate()
    const [tagInput, setTagInput] = useState('')
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [importRequest, setImportRequest] = useState('')
    const [importCount, setImportCount] = useState('10')
    const [importLevelStyle, setImportLevelStyle] = useState('')
    const [importJson, setImportJson] = useState('')
    const [copyStatus, setCopyStatus] = useState('')
    const upsertCollection = useCustomCollectionsStore((s) => s.upsertCollection)
    const deleteCollection = useCustomCollectionsStore((s) => s.deleteCollection)
    const resetCollection = useSRSStore((s) => s.resetCollection)

    const isPlayable = isValidCustomCollection(collection)
    const validChallengeCount = (collection.challenges ?? []).filter((challenge) => challenge.translation.trim()).length
    const parsedImport = useMemo(() => parseAiChatImportJson(importJson), [importJson])
    const importPrompt = useMemo(() => buildAiChatImportPrompt({
        request: importRequest,
        count: Number.parseInt(importCount, 10),
        levelStyle: importLevelStyle,
    }), [importCount, importLevelStyle, importRequest])

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

    const importChallenges = () => {
        if (parsedImport.challenges.length === 0) return

        updateCollection({
            challenges: [
                ...(collection.challenges ?? []),
                ...parsedImport.challenges.map((challenge) => ({
                    id: makeChallengeId(),
                    ...challenge,
                })),
            ],
        })
        setImportJson('')
        setCopyStatus('')
    }

    const copyImportPrompt = async () => {
        if (!navigator.clipboard) return
        await navigator.clipboard.writeText(importPrompt)
        setCopyStatus('Copied')
    }

    const removeChallenge = (id: string) => {
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
                        <ConfirmButton
                            confirmMessage="Delete this custom collection and its progress?"
                            onConfirm={handleDeleteCollection}
                        >
                            Delete
                        </ConfirmButton>
                    </div>
                </header>

                <section className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <label className="flex flex-col gap-1">
                        <span className="mono-label">title</span>
                        <Input
                            value={collection.title}
                            onChange={(event) => updateCollection({ title: event.target.value })}
                            placeholder="German A1 review"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="mono-label">mode</span>
                        <Select
                            value={collection.freeInput ? 'free' : 'slots'}
                            onChange={(event) => updateCollection({ freeInput: event.target.value === 'free' })}
                        >
                            <option value="free">Free input</option>
                            <option value="slots">Slot input</option>
                        </Select>
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="mono-label">description</span>
                        <Textarea
                            value={collection.description ?? ''}
                            onChange={(event) => updateCollection({ description: event.target.value })}
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
                                    <Button
                                        variant="link"
                                        onClick={() => removeTag(tag)}
                                        title={`Remove ${tag}`}
                                        className="text-xs no-underline"
                                    >
                                        &times;
                                    </Button>
                                </span>
                            ))}
                            {/* eslint-disable-next-line langtype/no-raw-ui-controls -- Compound tag chip input needs transparent flex sizing inside the chip container. */}
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
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={() => setIsImportOpen((isOpen) => !isOpen)}>
                                Import from AI chat
                            </Button>
                            <Button
                                onClick={addChallenge}
                            >
                                <IconPlus className="h-4 w-4" />
                                Add
                            </Button>
                        </div>
                    </div>

                    {isImportOpen && (
                        <div className="grid gap-4 rounded-[var(--radius)] border border-border bg-card p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                                <label className="flex flex-col gap-1">
                                    <span className="mono-label">request</span>
                                    <Textarea
                                        value={importRequest}
                                        onChange={(event) => setImportRequest(event.target.value)}
                                        className="bg-background"
                                        placeholder="Practice ordering food with separable verbs"
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="mono-label">count</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={importCount}
                                        onChange={(event) => setImportCount(event.target.value)}
                                        className="bg-background"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 md:col-span-2">
                                    <span className="mono-label">level/style</span>
                                    <Input
                                        value={importLevelStyle}
                                        onChange={(event) => setImportLevelStyle(event.target.value)}
                                        className="bg-background"
                                        placeholder="Optional, for example A2 casual speech"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="mono-label">copy prompt</span>
                                <Textarea
                                    readOnly
                                    value={importPrompt}
                                    className="min-h-72 bg-background font-mono text-[12px]"
                                />
                            </label>
                            <div className="flex items-center gap-3">
                                <Button onClick={copyImportPrompt}>Copy prompt</Button>
                                {copyStatus && <span className="font-mono text-[11px] text-muted-foreground">{copyStatus}</span>}
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="mono-label">paste JSON code block content</span>
                                <Textarea
                                    value={importJson}
                                    onChange={(event) => setImportJson(event.target.value)}
                                    className="min-h-40 bg-background font-mono text-[13px]"
                                    placeholder='[{"original":"Can you help me?","segments":[{"kind":"prefill","text":"Kannst du "},{"kind":"type","text":"mir helfen"},{"kind":"prefill","text":"?"}]}]'
                                />
                            </label>

                            {importJson.trim() && (
                                <div className="grid gap-3">
                                    {parsedImport.error ? (
                                        <div className="rounded-[var(--radius)] border border-[var(--incorrect)] bg-[var(--incorrect-bg)] px-3 py-2 text-sm">
                                            {parsedImport.error}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            {parsedImport.challenges.length} valid, {parsedImport.skippedCount} skipped
                                        </div>
                                    )}

                                    {parsedImport.challenges.length > 0 && (
                                        <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-background">
                                            {parsedImport.challenges.slice(0, 5).map((challenge, index) => (
                                                <div key={`${challenge.original ?? ''}-${challenge.translation}-${index}`} className="grid gap-1 px-3 py-2 text-sm">
                                                    {challenge.original && <span className="text-muted-foreground">{challenge.original}</span>}
                                                    <span className="font-mono text-[13px]">{challenge.translation}</span>
                                                </div>
                                            ))}
                                            {parsedImport.challenges.length > 5 && (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                                    {parsedImport.challenges.length - 5} more ready to import
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    onClick={importChallenges}
                                    disabled={parsedImport.challenges.length === 0}
                                >
                                    Insert {parsedImport.challenges.length || ''} challenges
                                </Button>
                            </div>
                        </div>
                    )}

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
                                        <Textarea
                                            value={challenge.original ?? ''}
                                            onChange={(event) => updateChallenge(challenge.id, { original: event.target.value })}
                                            className="bg-background"
                                            placeholder="Optional source text"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="mono-label">answer</span>
                                        <Textarea
                                            value={challenge.translation}
                                            onChange={(event) => updateChallenge(challenge.id, { translation: event.target.value })}
                                            className="bg-background"
                                            placeholder="Required answer"
                                        />
                                    </label>
                                    <div className="flex gap-2 md:flex-col">
                                        <IconButton
                                            aria-label="Move up"
                                            onClick={() => moveChallenge(index, -1)}
                                            disabled={index === 0}
                                            title="Move up"
                                        >
                                            <IconArrowUp className="h-4 w-4" />
                                        </IconButton>
                                        <IconButton
                                            aria-label="Move down"
                                            onClick={() => moveChallenge(index, 1)}
                                            disabled={index === (collection.challenges ?? []).length - 1}
                                            title="Move down"
                                        >
                                            <IconArrowDown className="h-4 w-4" />
                                        </IconButton>
                                        <ConfirmButton
                                            aria-label="Delete challenge"
                                            confirmMessage="Delete this challenge?"
                                            onConfirm={() => removeChallenge(challenge.id)}
                                            title="Delete challenge"
                                            className="inline-flex h-9 w-9 items-center justify-center p-0"
                                        >
                                            <IconTrash className="h-4 w-4" />
                                        </ConfirmButton>
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
