// Shared set of characters that are auto-inserted/pre-filled
export const AUTO_INSERT_CHARS = new Set([' ', ',', '.', '!', '?', ';', ':'])

/**
 * Formats the raw input to match the spacing of the target string.
 * Example: Input "HelloW", Target "Hello World" -> "Hello W"
 */
export function autoMatchSpacing(rawInput: string, target: string): string {
    // Treat spaces as removable always. 
    // We do NOT remove punctuation from input, because we want to allow the user to type it if they choose.
    // If they strictly type punctuation, we match it. If they skip it (and it's auto-insert), we insert it.
    const cleanInput = rawInput.replace(/\s/g, '') // Only strip spaces
    const inputChars = cleanInput.split('')

    let result = ''
    let inputIndex = 0

    for (let i = 0; i < target.length; i++) {
        // If we ran out of input characters, stop immediately.
        // This ensures backspace works (we don't "force" the next char).
        if (inputIndex >= inputChars.length) break

        const targetChar = target[i]
        const inputChar = inputChars[inputIndex]

        if (AUTO_INSERT_CHARS.has(targetChar)) {
            // It's an auto-insert char (space, comma, etc.)
            // Always append it to result to ensure formatting.
            result += targetChar

            // If the user actually TYPED this character, consume it from input.
            // This allows "Hello," (typed) or "Hello" (skipped comma) -> both work.
            if (inputChar === targetChar) {
                inputIndex++
            }
            // If inputChar !== targetChar, we proceed (effectively inserting the punctuation)
            // and will try to match inputChar against the NEXT targetChar in next iteration.
        } else {
            // Normal character.
            // We just append input character.
            result += inputChar
            inputIndex++
        }
    }

    return result
}

/**
 * Returns true if input matches target exactly, OR if target starts with input
 * and all remaining characters in target are auto-insert characters (punctuation/spaces).
 */
export function isFlexibleMatch(input: string, target: string): boolean {
    if (input === target) return true

    if (!target.startsWith(input)) return false

    const remaining = target.slice(input.length)
    for (const char of remaining) {
        if (!AUTO_INSERT_CHARS.has(char)) {
            return false
        }
    }

    return true
}
