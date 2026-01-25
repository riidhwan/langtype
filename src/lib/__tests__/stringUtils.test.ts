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
        // User types "Hello ", we expect "Hello" because the space is auto-inserted only when needed by next char?
        // Actually, if target has space, we insert it ONLY if we have content AFTER it?
        // Let's re-read the logic. 
        // Logic: iterates target. If target is space, add space. Else take input char. 
        // If input runs out, stop.
        // So "Hello" (input len 5). Target "Hello World".
        // 0..4 matches. 
        // 5 is space. We append space? 
        // My logic: `if (inputIndex >= inputChars.length) break`.
        // So if input is exhausted, we stop. "Hello" -> "Hello".
        // "Hello " -> clean "Hello" -> "Hello".
        // So expectation should be "Hello".
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
})
