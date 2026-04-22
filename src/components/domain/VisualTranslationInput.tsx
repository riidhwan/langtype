import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { AUTO_INSERT_CHARS, isFreebie } from "@/lib/stringUtils"

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
    preFilledIndices?: Set<number>
    status?: 'typing' | 'submitted' | 'completed'
}

type WordInfo = {
    text: string
    startIndex: number
}

// Helper to split text into mapped words with global indices
const getWordsWithIndices = (text: string): WordInfo[] => {
    const words: WordInfo[] = []
    let currentIndex = 0
    const rawWords = text.split(' ')

    rawWords.forEach((wordText) => {
        words.push({
            text: wordText,
            startIndex: currentIndex
        })
        // Add length of word + 1 for space (for index calculation next loop)
        currentIndex += wordText.length + 1
    })
    return words
}

export function VisualTranslationInput({
    value,
    onChange,
    onSubmit,
    targetText,
    preFilledIndices,
    status = 'typing'
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (status === 'typing') {
            const timeout = setTimeout(() => {
                inputRef.current?.focus()
            }, 50) // Small delay to ensure render/enable is complete
            return () => clearTimeout(timeout)
        }
    }, [targetText, status])

    const handleContainerClick = () => {
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSubmit) {
            onSubmit()
        }
    }

    const words = getWordsWithIndices(targetText)

    // Advance past freebies (spaces, auto-insert, pre-filled) so the cursor
    // lands on the first slot the user still needs to type, not on an unrendered space.
    let cursorIndex = value.length
    while (cursorIndex < targetText.length && isFreebie(cursorIndex, targetText, preFilledIndices)) {
        cursorIndex++
    }

    return (
        <div
            className="relative w-full max-w-2xl cursor-text font-mono"
            onClick={handleContainerClick}
        >
            {/* Hidden Input to capture keystrokes */}
            <input
                ref={inputRef}
                type="text"
                className="absolute inset-0 opacity-0 pointer-events-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={status !== 'typing'}
                autoCapitalize={targetText[0] === targetText[0]?.toLowerCase() ? "none" : "sentences"}
                autoCorrect="off"
                spellCheck="false"
            />

            {/* Visual Render Layer */}
            <div className="flex flex-wrap justify-center gap-y-4 gap-x-4">
                {words.map((word, wIdx) => (
                    <div key={wIdx} className="flex gap-x-1">
                        {word.text.split('').map((char, charOffset) => {
                            const index = word.startIndex + charOffset
                            const inputValue = value[index] || ""
                            const isTyped = index < value.length
                            const isCurrent = index === cursorIndex && status === 'typing'

                            // Feedback logic
                            let statusColor = "border-muted-foreground/30 text-muted-foreground"

                            // Determine if we should show a pre-filled hint (punctuation/spaces or indices from parentheses)
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
                                // Keep it gray (muted) but maybe slightly different? 
                                // Default muted is fine for pre-filled hints.
                                statusColor = "border-muted-foreground/30 text-muted-foreground"
                            }

                            return (
                                <div
                                    key={index}
                                    data-testid="char-slot"
                                    className={cn(
                                        "w-[26px] h-[38px] md:w-8 md:h-10 border-b-2 flex items-center justify-center font-mono text-lg md:text-xl transition-colors select-none",
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
        </div>
    )
}
