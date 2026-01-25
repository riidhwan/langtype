import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
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
                disabled={status === 'completed'}
            />

            {/* Visual Render Layer */}
            <div className="flex flex-wrap gap-y-4 gap-x-4">
                {words.map((word, wIdx) => (
                    <div key={wIdx} className="flex gap-x-1">
                        {word.text.split('').map((char, charOffset) => {
                            const index = word.startIndex + charOffset
                            const inputValue = value[index] || ""
                            const isTyped = index < value.length
                            const isCurrent = index === value.length && status === 'typing'

                            // Feedback logic
                            let statusColor = "border-muted-foreground/30 text-muted-foreground"

                            if (status === 'submitted' || status === 'completed') {
                                const isMatch = inputValue === char
                                statusColor = isMatch
                                    ? "border-green-500 bg-green-500/20 text-green-700"
                                    : "border-red-500 bg-red-500/20 text-red-600"
                            } else if (isTyped) {
                                statusColor = "border-foreground text-foreground"
                            }

                            return (
                                <div
                                    key={index}
                                    data-testid="char-slot"
                                    className={cn(
                                        "w-5 h-8 md:w-8 md:h-12 border-b-2 flex items-center justify-center text-lg md:text-2xl transition-colors select-none",
                                        statusColor,
                                        // Current cursor position
                                        isCurrent && "border-primary animate-pulse"
                                    )}
                                >
                                    {inputValue}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
