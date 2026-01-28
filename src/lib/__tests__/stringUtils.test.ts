import { describe, it, expect } from 'vitest'
import { autoMatchSpacing } from '../stringUtils'

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
        // 'Ohno' -> 'Oh' matches. ',' auto. 'n' != ','. ',' inserted.
        // ' ' auto. 'n' != ' '. ' ' inserted.
        // 'n' matches. 'o' matches.
        // '!' auto. Input exhausted. Break.
        // Result: "Oh, no"
        expect(autoMatchSpacing('Ohno', 'Oh, no!')).toBe('Oh, no')
    })
})
