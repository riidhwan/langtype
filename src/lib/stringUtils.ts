// Shared set of characters that are auto-inserted/pre-filled
export const AUTO_INSERT_CHARS = new Set([' ', ',', '.', '!', '?', ';', ':'])

/**
 * Formats the raw input to match the spacing of the target string.
 * Example: Input "HelloW", Target "Hello World" -> "Hello W"
 */
export function autoMatchSpacing(rawInput: string, target: string): string {
    // Remove spaces and common punctuation from input to treat it as a stream of meaningful characters
    const cleanInput = rawInput.replace(/[\s,.!?;:]/g, '')
    const inputChars = cleanInput.split('')



    let result = ''
    let inputIndex = 0

    for (let i = 0; i < target.length; i++) {
        const targetChar = target[i]

        if (AUTO_INSERT_CHARS.has(targetChar)) {
            // Include space or punctuation automatically
            result += targetChar
        } else {
            // If we ran out of input characters, stop
            if (inputIndex >= inputChars.length) break

            // Otherwise use the next input character
            result += inputChars[inputIndex]
            inputIndex++
        }
    }

    return result
}
