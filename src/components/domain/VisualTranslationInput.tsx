import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AUTO_INSERT_CHARS, isFreebie } from "@/lib/stringUtils"

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
    preFilledIndices?: Set<number>
    status?: 'typing' | 'submitted' | 'completed'
    freeInput?: boolean
}

type WordInfo = {
    text: string
    startIndex: number
}

type Segment =
    | { type: 'prefilled'; text: string }
    | { type: 'gap'; startIndex: number; length: number }

const getWordsWithIndices = (text: string): WordInfo[] => {
    const words: WordInfo[] = []
    let currentIndex = 0
    text.split(' ').forEach((wordText) => {
        words.push({ text: wordText, startIndex: currentIndex })
        currentIndex += wordText.length + 1
    })
    return words
}

// Splits targetText into alternating pre-filled and user-typed gap segments.
// Pre-filled = AUTO_INSERT_CHARS or preFilledIndices. Used by free input mode.
function buildSegments(targetText: string, preFilledIndices?: Set<number>): Segment[] {
    const segments: Segment[] = []
    let i = 0
    while (i < targetText.length) {
        if (isFreebie(i, targetText, preFilledIndices)) {
            let text = ''
            while (i < targetText.length && isFreebie(i, targetText, preFilledIndices)) {
                text += targetText[i++]
            }
            segments.push({ type: 'prefilled', text })
        } else {
            const startIndex = i
            while (i < targetText.length && !isFreebie(i, targetText, preFilledIndices)) {
                i++
            }
            segments.push({ type: 'gap', startIndex, length: i - startIndex })
        }
    }
    return segments
}

export function VisualTranslationInput({
    value,
    onChange,
    onSubmit,
    targetText,
    preFilledIndices,
    status = 'typing',
    freeInput = false,
}: Props) {
    const hiddenInputRef = useRef<HTMLInputElement>(null)
    const gapInputRefs = useRef<(HTMLInputElement | null)[]>([])

    const segments = freeInput ? buildSegments(targetText, preFilledIndices) : []
    const gapCount = segments.filter(s => s.type === 'gap').length

    const [gapValues, setGapValues] = useState<string[]>(() =>
        Array(gapCount).fill('')
    )
    const [activeGapIdx, setActiveGapIdx] = useState(0)

    // Reset gap state when the challenge changes.
    useEffect(() => {
        if (!freeInput) return
        const count = buildSegments(targetText, preFilledIndices)
            .filter(s => s.type === 'gap').length
        setGapValues(Array(count).fill(''))
        setActiveGapIdx(0)
    }, [targetText]) // eslint-disable-line react-hooks/exhaustive-deps

    // Focus management for free input mode.
    // Always focuses gap 0 on a new challenge — avoids stale activeGapIdx
    // racing with the reset effect when both fire on the same targetText change.
    // Imperative .focus() in handleGapKeyDown handles within-challenge navigation.
    useEffect(() => {
        if (freeInput && status === 'typing') {
            gapInputRefs.current[0]?.focus()
        }
    }, [targetText, freeInput, status])

    // Focus management for slot mode.
    useEffect(() => {
        if (!freeInput && status === 'typing') {
            const timeout = setTimeout(() => hiddenInputRef.current?.focus(), 50)
            return () => clearTimeout(timeout)
        }
    }, [targetText, status, freeInput])

    const handleContainerClick = () => {
        if (freeInput) {
            gapInputRefs.current[activeGapIdx]?.focus()
        } else {
            hiddenInputRef.current?.focus()
        }
    }

    const handleHiddenKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSubmit) onSubmit()
    }

    const buildFullAnswer = (vals: string[]) => {
        let result = ''
        let gi = 0
        for (const seg of segments) {
            result += seg.type === 'prefilled' ? seg.text : (vals[gi++] ?? '')
        }
        return result
    }

    const handleGapChange = (gapIdx: number, newVal: string) => {
        const updated = gapValues.map((v, i) => i === gapIdx ? newVal : v)
        setGapValues(updated)
        onChange(buildFullAnswer(updated))
    }

    const handleGapKeyDown = (gapIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (gapIdx < gapCount - 1) {
            const nextIdx = gapIdx + 1
            setActiveGapIdx(nextIdx)
            gapInputRefs.current[nextIdx]?.focus()
        } else {
            onSubmit?.()
        }
    }

    const words = getWordsWithIndices(targetText)

    // Advance past freebies so the cursor lands on the first slot the user still needs to type.
    let cursorIndex = value.length
    while (cursorIndex < targetText.length && isFreebie(cursorIndex, targetText, preFilledIndices)) {
        cursorIndex++
    }

    // Slot size is determined by the longest word in the challenge so all words render uniformly.
    const maxWordLen = Math.max(...words.map(w => w.text.length))
    const slotSize = maxWordLen >= 14
        ? "w-4 h-7 text-sm md:w-5 md:h-8 md:text-base"
        : maxWordLen >= 12
            ? "w-5 h-8 text-base md:w-6 md:h-9 md:text-lg"
            : "w-[26px] h-[38px] text-lg md:w-8 md:h-10 md:text-xl"
    const wordGap = maxWordLen >= 14 ? "gap-x-0.5" : "gap-x-1"

    return (
        <div
            data-testid="visual-translation-input"
            className="relative w-full max-w-2xl cursor-text font-mono"
            onClick={handleContainerClick}
        >
            {freeInput ? (
                /* Free input mode — pre-filled shown as static text, gaps as individual inputs */
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
                    {(() => {
                        let gapIdx = 0
                        return segments.map((seg, i) => {
                            if (seg.type === 'prefilled') {
                                return (
                                    <span key={i} className="font-mono text-lg md:text-xl text-muted-foreground select-none">
                                        {seg.text}
                                    </span>
                                )
                            }
                            const currentGapIdx = gapIdx++
                            const gapVal = gapValues[currentGapIdx] ?? ''
                            const isActiveGap = currentGapIdx === activeGapIdx && status === 'typing'
                            let gapColor = 'border-muted-foreground/40 text-foreground'
                            if (status === 'submitted' || status === 'completed') {
                                const expected = targetText.slice(seg.startIndex, seg.startIndex + seg.length)
                                gapColor = gapVal === expected
                                    ? 'border-[var(--correct)] text-[var(--correct)]'
                                    : 'border-[var(--incorrect)] text-[var(--incorrect)]'
                            }
                            return (
                                <input
                                    key={i}
                                    ref={el => { gapInputRefs.current[currentGapIdx] = el }}
                                    type="text"
                                    value={gapVal}
                                    onChange={(e) => handleGapChange(currentGapIdx, e.target.value)}
                                    onKeyDown={(e) => handleGapKeyDown(currentGapIdx, e)}
                                    onFocus={() => setActiveGapIdx(currentGapIdx)}
                                    disabled={status !== 'typing'}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    autoCapitalize="none"
                                    style={{ width: `${Math.max(1.5, gapVal.length + 0.5)}ch` }}
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
                        })
                    })()}
                </div>
            ) : (
                /* Slot mode — hidden input + one box per character */
                <>
                    <input
                        ref={hiddenInputRef}
                        type="text"
                        className="absolute inset-0 opacity-0 pointer-events-none"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleHiddenKeyDown}
                        autoFocus
                        disabled={status !== 'typing'}
                        autoCapitalize={targetText[0] === targetText[0]?.toLowerCase() ? "none" : "sentences"}
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    <div className="flex flex-wrap justify-center gap-y-4 gap-x-4">
                        {words.map((word, wIdx) => (
                            <div key={wIdx} className={cn("flex", wordGap)}>
                                {word.text.split('').map((char, charOffset) => {
                                    const index = word.startIndex + charOffset
                                    const inputValue = value[index] || ""
                                    const isTyped = index < value.length
                                    const isCurrent = index === cursorIndex && status === 'typing'

                                    let statusColor = "border-muted-foreground/30 text-muted-foreground"

                                    const isAutoInsert = AUTO_INSERT_CHARS.has(char)
                                    const isPreFilledIdx = preFilledIndices?.has(index)
                                    const isPreFilled = !inputValue && (isAutoInsert || isPreFilledIdx)
                                    const displayChar = inputValue || (isPreFilled ? char : "")

                                    if (status === 'submitted' || status === 'completed') {
                                        const isMatch = inputValue === char || (!inputValue && (isPreFilledIdx || isAutoInsert))
                                        statusColor = isMatch
                                            ? "border-b-[var(--correct)] bg-[var(--correct-bg)] text-[var(--correct)]"
                                            : "border-b-[var(--incorrect)] bg-[var(--incorrect-bg)] text-[var(--incorrect)]"
                                    } else if (isTyped) {
                                        statusColor = "border-foreground text-foreground"
                                    } else if (isPreFilled) {
                                        statusColor = "border-muted-foreground/30 text-muted-foreground"
                                    }

                                    return (
                                        <div
                                            key={index}
                                            data-testid="char-slot"
                                            className={cn(
                                                "border-b-2 flex items-center justify-center font-mono transition-colors select-none",
                                                slotSize,
                                                statusColor,
                                                isCurrent && "outline outline-2 outline-[var(--accent)] outline-offset-[3px]"
                                            )}
                                        >
                                            {displayChar}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
