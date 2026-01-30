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
 * Formats the raw input to match the spacing of the target string.
 * Example: Input "HelloW", Target "Hello World" -> "Hello W"
 */
export function autoMatchSpacing(rawInput: string, target: string, preFilledIndices?: Set<number>): string {
    // Treat spaces as removable always. 
    // We do NOT remove punctuation from input, because we want to allow the user to type it if they choose.
    // If they strictly type punctuation, we match it. If they skip it (and it's auto-insert), we insert it.
    const cleanInput = rawInput.replace(/\s/g, '') // Only strip spaces
    const inputChars = cleanInput.split('')

    let result = ''
    let inputIndex = 0

    for (let i = 0; i < target.length; i++) {
        const targetChar = target[i]
        const isPreFilled = preFilledIndices?.has(i)
        const isAutoInsert = AUTO_INSERT_CHARS.has(targetChar)

        if (isPreFilled || isAutoInsert) {
            // It's an auto-insert char or pre-filled from parentheses.

            // Check if we should append it. 
            // - Pre-filled chars (parentheses) are ALWAYS appended.
            // - Auto-insert chars (punctuation) are appended if user typed it OR more input is coming.

            const hasMoreInput = inputIndex < inputChars.length
            const matchesInput = hasMoreInput && inputChars[inputIndex] === targetChar
            const userTypedIt = !isPreFilled && matchesInput

            let willNeedMore = false
            if (hasMoreInput) {
                // Find if there's any non-auto-insert/non-prefilled char ahead in target
                for (let j = i + 1; j < target.length; j++) {
                    if (!AUTO_INSERT_CHARS.has(target[j]) && !preFilledIndices?.has(j)) {
                        willNeedMore = true
                        break
                    }
                }
            }

            if (isPreFilled || userTypedIt || willNeedMore) {
                result += targetChar
                if (matchesInput) {
                    // SMART CONSUMPTION:
                    // If this is a pre-filled or auto-insert character, and it matches the last
                    // character of our current input, we should only consume it if it's NOT
                    // a match for the next required normal character.
                    const isLastChar = inputIndex === inputChars.length - 1
                    const isFreebie = isPreFilled || isAutoInsert

                    let isAmbiguous = false
                    if (isFreebie && isLastChar && willNeedMore) {
                        // Find the next normal character
                        for (let j = i + 1; j < target.length; j++) {
                            if (!AUTO_INSERT_CHARS.has(target[j]) && !preFilledIndices?.has(j)) {
                                if (target[j].toLowerCase() === targetChar.toLowerCase()) {
                                    isAmbiguous = true
                                }
                                break
                            }
                        }
                    }

                    if (!isAmbiguous) {
                        inputIndex++
                    }
                }
            } else {
                // We reached an auto-insert char at the end and don't have input for what's after it.
                // Stop here to avoid eager punctuation.
                break
            }
        } else {
            // Normal character.
            if (inputIndex >= inputChars.length) break

            const inputChar = inputChars[inputIndex]

            // SMART CASE: first non-spacing char
            const isFirstChar = result.length === 0 || !result.trim()
            let processedInputChar = inputChar
            if (isFirstChar &&
                inputChar.toLowerCase() === targetChar.toLowerCase() &&
                targetChar !== targetChar.toUpperCase()) {
                processedInputChar = inputChar.toLowerCase()
            }

            result += processedInputChar
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
