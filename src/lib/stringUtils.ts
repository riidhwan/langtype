// Shared set of characters that are auto-inserted/pre-filled
export const AUTO_INSERT_CHARS = new Set([' ', ',', '.', '!', '?', ';', ':', '/'])

export interface ParsedSentence {
    text: string
    preFilledIndices: Set<number>
}

/**
 * Parses a string to extract text inside parentheses as pre-filled.
 * Parentheses are removed from the resulting text.
 * Example: "(der) Tisch" -> text: "der Tisch", preFilledIndices: {0, 1, 2, 3}
 */
export function parseSentence(raw: string): ParsedSentence {
    const preFilledIndices = new Set<number>()
    let cleanText = ''
    let isInsideParens = false

    for (let i = 0; i < raw.length; i++) {
        const char = raw[i]
        if (char === '(') {
            isInsideParens = true
            continue
        }
        if (char === ')') {
            isInsideParens = false
            continue
        }

        if (isInsideParens) {
            preFilledIndices.add(cleanText.length)
        }
        cleanText += char
    }

    return { text: cleanText, preFilledIndices }
}

/**
 * Checks if a character at a given index in the target string is a "freebie"
 * (either an auto-insert character or a pre-filled character).
 */
export function isFreebie(index: number, target: string, preFilledIndices?: Set<number>): boolean {
    const char = target[index]
    return AUTO_INSERT_CHARS.has(char) || (preFilledIndices?.has(index) ?? false)
}

/**
 * Finds the index and value of the next "normal" (non-freebie) character in the target string.
 */
export function findNextNormalChar(startIndex: number, target: string, preFilledIndices?: Set<number>): { char: string; index: number } | null {
    for (let i = startIndex; i < target.length; i++) {
        if (!isFreebie(i, target, preFilledIndices)) {
            return { char: target[i], index: i }
        }
    }
    return null
}

/**
 * Encapsulates the logic for deciding if a "freebie" character should be appended to the result.
 */
function shouldAppendFreebie(
    char: string,
    index: number,
    target: string,
    hasMoreInput: boolean,
    typedInputMatch: boolean,
    preFilledIndices?: Set<number>
): boolean {
    const isPreFilled = preFilledIndices?.has(index)
    if (isPreFilled) return true
    if (typedInputMatch) return true

    const nextNormal = findNextNormalChar(index + 1, target, preFilledIndices)
    const willNeedMore = hasMoreInput && nextNormal !== null
    return willNeedMore
}

/**
 * Formats the raw input to match the spacing of the target string.
 * This is the core engine for automatic punctuation, spacing and pre-filling.
 */
export function autoMatchSpacing(rawInput: string, target: string, preFilledIndices?: Set<number>): string {
    const cleanInput = rawInput.replace(/\s/g, '')
    const inputChars = cleanInput.split('')

    let result = ''
    let inputIndex = 0

    for (let i = 0; i < target.length; i++) {
        const targetChar = target[i]
        const hasMoreInput = inputIndex < inputChars.length

        if (isFreebie(i, target, preFilledIndices)) {
            const matchesInput = hasMoreInput && inputChars[inputIndex] === targetChar
            const append = shouldAppendFreebie(targetChar, i, target, hasMoreInput, matchesInput, preFilledIndices)

            if (!append) break

            result += targetChar

            if (matchesInput) {
                // Determine if we should consume the input character.
                // It's ambiguous if the user typed a char that matches this freebie
                // but actually intended it to match the next normal character.
                const isLastTypedChar = inputIndex === inputChars.length - 1
                const nextNormal = findNextNormalChar(i + 1, target, preFilledIndices)
                const isAmbiguous = isLastTypedChar && nextNormal && nextNormal.char.toLowerCase() === targetChar.toLowerCase()

                if (!isAmbiguous) {
                    inputIndex++
                }
            }
        } else {
            // Normal character processing
            if (!hasMoreInput) break

            const inputChar = inputChars[inputIndex]

            // Smart Case: Lowercase first non-spacing char if target expects it
            const isFirstChar = result.length === 0 || !result.trim()
            let processedChar = inputChar
            if (isFirstChar &&
                inputChar.toLowerCase() === targetChar.toLowerCase() &&
                targetChar !== targetChar.toUpperCase()) {
                processedChar = inputChar.toLowerCase()
            }

            result += processedChar
            inputIndex++
        }
    }

    return result
}

/**
 * Returns true if input matches target exactly, OR if target starts with input
 * and all remaining characters in target are auto-insert characters (punctuation/spaces/pre-filled).
 */
export function isFlexibleMatch(input: string, target: string, preFilledIndices?: Set<number>): boolean {
    if (input.toLowerCase() === target.toLowerCase()) return true
    if (!target.toLowerCase().startsWith(input.toLowerCase())) return false

    const remaining = target.slice(input.length)
    for (let i = 0; i < remaining.length; i++) {
        const targetIdx = input.length + i
        const char = remaining[i]
        if (!AUTO_INSERT_CHARS.has(char) && !preFilledIndices?.has(targetIdx)) {
            return false
        }
    }

    return true
}
