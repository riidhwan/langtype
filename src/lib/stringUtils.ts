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

// Returns true when a typed freebie char is ambiguous — the user may have intended
// it to match the next normal character rather than this freebie.
function isAmbiguousFreebieConsumption(
    inputIndex: number,
    inputChars: string[],
    targetIndex: number,
    targetChar: string,
    target: string,
    preFilledIndices?: Set<number>,
): boolean {
    const isLastTypedChar = inputIndex === inputChars.length - 1
    const nextNormal = findNextNormalChar(targetIndex + 1, target, preFilledIndices)
    return isLastTypedChar && nextNormal !== null && nextNormal.char.toLowerCase() === targetChar.toLowerCase()
}

// Lowercases the input char when it is the first real character and the target
// expects lowercase, so users who type capital letters are silently corrected.
function applySmartCase(inputChar: string, targetChar: string, resultSoFar: string): string {
    const isFirstChar = resultSoFar.length === 0 || !resultSoFar.trim()
    if (isFirstChar && inputChar.toLowerCase() === targetChar.toLowerCase() && targetChar !== targetChar.toUpperCase()) {
        return inputChar.toLowerCase()
    }
    return inputChar
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

            if (matchesInput && !isAmbiguousFreebieConsumption(inputIndex, inputChars, i, targetChar, target, preFilledIndices)) {
                inputIndex++
            }
        } else {
            if (!hasMoreInput) break

            result += applySmartCase(inputChars[inputIndex], targetChar, result)
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
