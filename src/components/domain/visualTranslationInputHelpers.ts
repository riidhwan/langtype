import { isFreebie } from '@/lib/stringUtils'

export type TranslationInputStatus = 'typing' | 'submitted' | 'completed'

export interface WordInfo {
    text: string
    startIndex: number
}

export type Segment =
    | { type: 'prefilled'; text: string }
    | { type: 'gap'; startIndex: number; length: number }

interface SlotSizing {
    slotSize: string
    wordGap: string
}

export function getWordsWithIndices(text: string): WordInfo[] {
    const words: WordInfo[] = []
    let currentIndex = 0

    text.split(' ').forEach((wordText) => {
        words.push({ text: wordText, startIndex: currentIndex })
        currentIndex += wordText.length + 1
    })

    return words
}

/** Splits target text into static freebies and user-typed gaps for free input mode. */
export function buildSegments(targetText: string, preFilledIndices?: Set<number>): Segment[] {
    const segments: Segment[] = []
    let i = 0

    while (i < targetText.length) {
        if (isFreebie(i, targetText, preFilledIndices)) {
            let text = ''
            while (i < targetText.length && isFreebie(i, targetText, preFilledIndices)) {
                text += targetText[i]
                i++
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

/** Reassembles free input gaps with their static prefilled segments. */
export function buildFullAnswer(segments: Segment[], gapValues: string[]): string {
    let result = ''
    let gapIndex = 0

    for (const segment of segments) {
        result += segment.type === 'prefilled'
            ? segment.text
            : (gapValues[gapIndex++] ?? '')
    }

    return result
}

export function getSlotSizing(words: WordInfo[]): SlotSizing {
    const maxWordLength = Math.max(0, ...words.map((word) => word.text.length))

    if (maxWordLength >= 14) {
        return {
            slotSize: 'w-4 h-7 text-sm md:w-5 md:h-8 md:text-base',
            wordGap: 'gap-x-0.5',
        }
    }

    if (maxWordLength >= 12) {
        return {
            slotSize: 'w-5 h-8 text-base md:w-6 md:h-9 md:text-lg',
            wordGap: 'gap-x-1',
        }
    }

    return {
        slotSize: 'w-[26px] h-[38px] text-lg md:w-8 md:h-10 md:text-xl',
        wordGap: 'gap-x-1',
    }
}
