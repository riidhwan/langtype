import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { TranslationInputStatus } from './visualTranslationInputHelpers'
import { buildFullAnswer, buildSegments } from './visualTranslationInputHelpers'

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
    preFilledIndices?: Set<number>
    status: TranslationInputStatus
}

export function FreeTranslationInput({
    onChange,
    onSubmit,
    targetText,
    preFilledIndices,
    status,
}: Props) {
    const gapInputRefs = useRef<(HTMLInputElement | null)[]>([])

    const segments = useMemo(
        () => buildSegments(targetText, preFilledIndices),
        [targetText, preFilledIndices]
    )
    const gapCount = segments.filter((segment) => segment.type === 'gap').length

    const [gapValues, setGapValues] = useState<string[]>(() => Array(gapCount).fill(''))
    const [activeGapIndex, setActiveGapIndex] = useState(0)

    useEffect(() => {
        setGapValues(Array(gapCount).fill(''))
        setActiveGapIndex(0)
    }, [gapCount, segments])

    useEffect(() => {
        if (status === 'typing') {
            gapInputRefs.current[0]?.focus()
        }
    }, [targetText, status])

    const handleContainerClick = () => {
        gapInputRefs.current[activeGapIndex]?.focus()
    }

    const handleGapChange = (gapIndex: number, newValue: string) => {
        const updated = gapValues.map((value, index) => index === gapIndex ? newValue : value)
        setGapValues(updated)
        onChange(buildFullAnswer(segments, updated))
    }

    const handleGapKeyDown = (gapIndex: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return

        event.preventDefault()
        if (gapIndex < gapCount - 1) {
            const nextIndex = gapIndex + 1
            setActiveGapIndex(nextIndex)
            gapInputRefs.current[nextIndex]?.focus()
        } else {
            onSubmit?.()
        }
    }

    let gapIndex = 0

    return (
        <div
            data-testid="visual-translation-input"
            className="relative w-full max-w-2xl cursor-text font-mono"
            onClick={handleContainerClick}
        >
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
                {segments.map((segment, index) => {
                    if (segment.type === 'prefilled') {
                        return (
                            <span key={index} className="font-mono text-lg md:text-xl text-muted-foreground select-none">
                                {segment.text}
                            </span>
                        )
                    }

                    const currentGapIndex = gapIndex
                    gapIndex++
                    const gapValue = gapValues[currentGapIndex] ?? ''
                    const isActiveGap = currentGapIndex === activeGapIndex && status === 'typing'
                    let gapColor = 'border-muted-foreground/40 text-foreground'
                    let isGapCorrect = false

                    if (status === 'submitted' || status === 'completed') {
                        const expected = targetText.slice(segment.startIndex, segment.startIndex + segment.length)
                        isGapCorrect = gapValue === expected
                        gapColor = isGapCorrect
                            ? 'border-[var(--correct)] text-[var(--correct)]'
                            : 'border-[var(--incorrect)] text-[var(--incorrect)]'
                    }
                    const gapState = status === 'submitted' || status === 'completed'
                        ? (isGapCorrect ? 'correct' : 'incorrect')
                        : (isActiveGap ? 'active' : 'idle')

                    return (
                        <input
                            key={index}
                            ref={(element) => { gapInputRefs.current[currentGapIndex] = element }}
                            type="text"
                            aria-label={`Translation gap ${currentGapIndex + 1}`}
                            data-testid="translation-gap"
                            data-gap-state={gapState}
                            value={gapValue}
                            onChange={(event) => handleGapChange(currentGapIndex, event.target.value)}
                            onKeyDown={(event) => handleGapKeyDown(currentGapIndex, event)}
                            onFocus={() => setActiveGapIndex(currentGapIndex)}
                            disabled={status !== 'typing'}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            autoCapitalize="none"
                            style={{ width: `${Math.max(1.5, gapValue.length + 0.5)}ch` }}
                            className={cn(
                                'bg-transparent border-0 border-b-2 rounded-none font-mono text-lg md:text-xl',
                                'py-0 px-0.5 transition-colors',
                                gapColor,
                                isActiveGap
                                    ? 'outline outline-2 outline-[var(--accent)] outline-offset-[3px]'
                                    : 'outline-none'
                            )}
                        />
                    )
                })}
            </div>
        </div>
    )
}
