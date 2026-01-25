/**
 * Formats the raw input to match the spacing of the target string.
 * Example: Input "HelloW", Target "Hello World" -> "Hello W"
 */
export function autoMatchSpacing(rawInput: string, target: string): string {
    // Remove all spaces from input to treat it as a stream of characters
    // behave as if the user never types spaces
    const cleanInput = rawInput.replace(/\s/g, '')
    const inputChars = cleanInput.split('')

    let result = ''
    let inputIndex = 0

    for (let i = 0; i < target.length; i++) {
        // If we ran out of input characters, stop
        if (inputIndex >= inputChars.length) break

        const targetChar = target[i]

        if (targetChar === ' ') {
            // If target has a space, force a space in result
            result += ' '
        } else {
            // Otherwise use the next input character
            result += inputChars[inputIndex]
            inputIndex++
        }
    }

    return result
}
