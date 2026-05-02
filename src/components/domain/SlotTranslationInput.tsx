import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { AUTO_INSERT_CHARS, isFreebie } from '@/lib/stringUtils'
import { cn } from '@/lib/utils'
import type { TranslationInputStatus } from './visualTranslationInputHelpers'
import { getSlotSizing, getWordsWithIndices } from './visualTranslationInputHelpers'

interface Props {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    targetText: string
    preFilledIndices?: Set<number>
    status: TranslationInputStatus
}

export function SlotTranslationInput({
    value,
    onChange,
    onSubmit,
    targetText,
    preFilledIndices,
    status,
}: Props) {
    const hiddenInputRef = useRef<HTMLInputElement>(null)

    const words = getWordsWithIndices(targetText)
    const { tier, slotSize, wordGap } = getSlotSizing(words)

    useEffect(() => {
        if (status !== 'typing') return

        const timeout = setTimeout(() => hiddenInputRef.current?.focus(), 50)
        return () => clearTimeout(timeout)
    }, [targetText, status])

    const handleContainerClick = () => {
        hiddenInputRef.current?.focus()
    }

    const handleHiddenKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onSubmit?.()
        }
    }

    let cursorIndex = value.length
    while (cursorIndex < targetText.length && isFreebie(cursorIndex, targetText, preFilledIndices)) {
        cursorIndex++
    }

    return (
        <div
            data-testid="visual-translation-input"
            className="relative w-full max-w-2xl cursor-text font-mono"
            onClick={handleContainerClick}
        >
            <input
                ref={hiddenInputRef}
                type="text"
                aria-label="Translation answer"
                className="absolute inset-0 opacity-0 pointer-events-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleHiddenKeyDown}
                autoFocus
                disabled={status !== 'typing'}
                autoCapitalize={targetText[0] === targetText[0]?.toLowerCase() ? 'none' : 'sentences'}
                autoCorrect="off"
                spellCheck="false"
            />
            <div className="flex flex-wrap justify-center gap-y-4 gap-x-4">
                {words.map((word, wordIndex) => (
                    <div key={wordIndex} className={cn('flex', wordGap)}>
                        {word.text.split('').map((char, charOffset) => {
                            const index = word.startIndex + charOffset
                            const inputValue = value[index] || ''
                            const isTyped = index < value.length
                            const isCurrent = index === cursorIndex && status === 'typing'

                            let statusColor = 'border-muted-foreground/30 text-muted-foreground'

                            const isAutoInsert = AUTO_INSERT_CHARS.has(char)
                            const isPreFilledIndex = preFilledIndices?.has(index)
                            const isPreFilled = !inputValue && (isAutoInsert || isPreFilledIndex)
                            const displayChar = inputValue || (isPreFilled ? char : '')
                            let slotState = isTyped ? 'typed' : 'empty'

                            if (status === 'submitted' || status === 'completed') {
                                const isMatch = inputValue === char || (!inputValue && (isPreFilledIndex || isAutoInsert))
                                slotState = isMatch ? 'correct' : 'incorrect'
                                statusColor = isMatch
                                    ? 'border-b-[var(--correct)] bg-[var(--correct-bg)] text-[var(--correct)]'
                                    : 'border-b-[var(--incorrect)] bg-[var(--incorrect-bg)] text-[var(--incorrect)]'
                            } else if (isTyped) {
                                statusColor = 'border-foreground text-foreground'
                            }

                            return (
                                <div
                                    key={index}
                                    data-testid="char-slot"
                                    data-current={isCurrent ? 'true' : undefined}
                                    data-slot-size={tier}
                                    data-slot-state={slotState}
                                    className={cn(
                                        'border-b-2 flex items-center justify-center font-mono transition-colors select-none',
                                        slotSize,
                                        statusColor,
                                        isCurrent && 'outline outline-2 outline-[var(--accent)] outline-offset-[3px]'
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
