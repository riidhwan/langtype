import { describe, it, expect } from 'vitest'
import { autoMatchSpacing, isFlexibleMatch, parseSentence } from '../stringUtils'

describe('autoMatchSpacing', () => {
    const target = 'Hello World'

    it('inserts space automatically', () => {
        // User types "HelloW", we expect "Hello W"
        expect(autoMatchSpacing('HelloW', target)).toBe('Hello W')
    })

    it('handles exact partial match without space', () => {
        expect(autoMatchSpacing('Hello', target)).toBe('Hello')
    })

    it('ignores manual spaces if they do not add new content', () => {
        expect(autoMatchSpacing('Hello ', target)).toBe('Hello')
    })

    it('handles user typing the space manually followed by char', () => {
        // User types "Hello W", we expect "Hello W"
        expect(autoMatchSpacing('Hello W', target)).toBe('Hello W')
    })

    it('handles multiple spaces', () => {
        const doubleTarget = 'A B C'
        expect(autoMatchSpacing('AB', doubleTarget)).toBe('A B')
        expect(autoMatchSpacing('ABC', doubleTarget)).toBe('A B C')
    })

    it('handles mismatching chars', () => {
        // If user types wrong char, we still respect target spacing if we reached a space slot
        // Target: "A B". User types "XY" -> "X Y"
        expect(autoMatchSpacing('XY', 'A B')).toBe('X Y')
    })

    it('inserts punctuation automatically', () => {
        expect(autoMatchSpacing('Hello', 'Hello,')).toBe('Hello')
        expect(autoMatchSpacing('HelloW', 'Hello, World')).toBe('Hello, W')
        expect(autoMatchSpacing('End', 'End.')).toBe('End')
        expect(autoMatchSpacing('End.', 'End.')).toBe('End.')
    })

    it('handles mismatching chars', () => {
        // If user types wrong char, we still respect target spacing if we reached a space slot
        // Target: "A B". User types "XY" -> "X Y"
        expect(autoMatchSpacing('XY', 'A B')).toBe('X Y')
    })

    // Note: Previous test block for 'inserts punctuation automatically' was duplicative/confusing.
    // Consolidating here logic verification:
    it('inserts punctuation automatically but not eagerly at end', () => {
        expect(autoMatchSpacing('Hello', 'Hello,')).toBe('Hello')
        expect(autoMatchSpacing('HelloW', 'Hello, World')).toBe('Hello, W')
        expect(autoMatchSpacing('End', 'End.')).toBe('End')
        expect(autoMatchSpacing('End.', 'End.')).toBe('End.')
        expect(autoMatchSpacing('Wow', 'Wow!')).toBe('Wow')
        expect(autoMatchSpacing('What', 'What?')).toBe('What')
    })

    it('handles mixed space and punctuation', () => {
        expect(autoMatchSpacing('Ohno', 'Oh, no!')).toBe('Oh, no')
    })

    it('handles smart case: lowecases first char if target expects lowercase', () => {
        // User types "Der" but target is "der" -> should be "der"
        expect(autoMatchSpacing('Der', 'der Mann')).toBe('der')
        // User types "Die" but target is "die" -> should be "die"
        expect(autoMatchSpacing('Die', 'die Frau')).toBe('die')
        // User types "A" for "apfel" -> "a"
        expect(autoMatchSpacing('A', 'apfel')).toBe('a')
    })

    it('handles smart case: preserves uppercase if target expects uppercase', () => {
        // User types "M" for "Mann" -> should be "M"
        expect(autoMatchSpacing('M', 'Mann')).toBe('M')
        // User types "BMW" -> should be "BMW" (or at least "B")
        expect(autoMatchSpacing('B', 'BMW')).toBe('B')
    })
})

describe('isFlexibleMatch', () => {
    it('returns true for exact matches', () => {
        expect(isFlexibleMatch('Hello', 'Hello')).toBe(true)
        expect(isFlexibleMatch('Hello World!', 'Hello World!')).toBe(true)
    })

    it('returns true if only trailing punctuation is missing', () => {
        expect(isFlexibleMatch('Hello', 'Hello!')).toBe(true)
        expect(isFlexibleMatch('How are you', 'How are you?')).toBe(true)
        expect(isFlexibleMatch('Wait', 'Wait...')).toBe(true)
    })

    it('returns false if non-punctuation characters are missing', () => {
        expect(isFlexibleMatch('Hell', 'Hello')).toBe(false)
        expect(isFlexibleMatch('Hello worl', 'Hello world!')).toBe(false)
    })

    it('returns false if there is a mismatch in typed characters', () => {
        expect(isFlexibleMatch('Hella', 'Hello')).toBe(false)
        expect(isFlexibleMatch('How are you!', 'How are you?')).toBe(false)
    })

    it('handles spaces as auto-insert characters', () => {
        // Since spaces are in AUTO_INSERT_CHARS, they should be flexible too
        expect(isFlexibleMatch('Hello', 'Hello ')).toBe(true)
    })
})

describe('parseSentence', () => {
    it('removes parentheses and identifies pre-filled indices', () => {
        const result = parseSentence('(der) Tisch')
        expect(result.text).toBe('der Tisch')
        // "(der)" -> "der" are indices 0, 1, 2. The space is NOT pre-filled by parens.
        expect(Array.from(result.preFilledIndices)).toEqual([0, 1, 2])
    })

    it('handles multiple parentheses', () => {
        const result = parseSentence('(the) apple (is) green')
        expect(result.text).toBe('the apple is green')
        // "the" (0,1,2) and "is" (10,11)
        expect(result.preFilledIndices.has(0)).toBe(true)
        expect(result.preFilledIndices.has(10)).toBe(true)
        expect(result.preFilledIndices.has(3)).toBe(false) // space
        expect(result.preFilledIndices.has(12)).toBe(false) // space
    })

    it('handles strings without parentheses', () => {
        const result = parseSentence('Hello World')
        expect(result.text).toBe('Hello World')
        expect(result.preFilledIndices.size).toBe(0)
    })
})

describe('autoMatchSpacing with preFilledIndices', () => {
    const target = 'der Tisch'
    const preFilledIndices = new Set([0, 1, 2, 3]) // "der "

    it('pre-fills content from indices', () => {
        // If user types 'T', and 'der ' is pre-filled:
        expect(autoMatchSpacing('T', target, preFilledIndices)).toBe('der T')
    })

    it('pre-fills content from indices even with empty input', () => {
        // Should return "der " even if user typed nothing
        expect(autoMatchSpacing('', target, preFilledIndices)).toBe('der ')
    })

    it('consumes manual input if it matches pre-filled indices', () => {
        // User types 'd' for 'der Tisch' where 'der ' is pre-filled.
        // It SHOULD consume 'd' because it matches the pre-filled 'd' at index 0.
        // Result remains "der " (nothing leaked to slot 4).
        expect(autoMatchSpacing('d', target, preFilledIndices)).toBe('der ')
    })

    it('handles input that includes pre-filled prefix without duplicating it', () => {
        expect(autoMatchSpacing('der T', target, preFilledIndices)).toBe('der T')
    })
})
