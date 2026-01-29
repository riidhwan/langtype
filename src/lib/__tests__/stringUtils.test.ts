import { describe, it, expect } from 'vitest'
import { autoMatchSpacing, isFlexibleMatch } from '../stringUtils'

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
