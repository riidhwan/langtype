import { shuffleArray } from '../utils'
import { describe, it, expect } from 'vitest'

describe('shuffleArray', () => {
    it('should maintain the same elements', () => {
        const input = [1, 2, 3, 4, 5]
        const shuffled = shuffleArray(input)
        expect(shuffled).toHaveLength(input.length)
        expect(shuffled.sort()).toEqual(input.sort())
    })

    it('should change the order of elements (statistically)', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        let sameOrderCount = 0
        const iterations = 100

        for (let i = 0; i < iterations; i++) {
            const shuffled = shuffleArray(input)
            if (JSON.stringify(shuffled) === JSON.stringify(input)) {
                sameOrderCount++
            }
        }

        // It is extremely unlikely to match 100 times in a row
        expect(sameOrderCount).toBeLessThan(iterations)
    })

    it('should handle empty array', () => {
        const input: number[] = []
        const shuffled = shuffleArray(input)
        expect(shuffled).toEqual([])
    })

    it('should handle single element array', () => {
        const input = [1]
        const shuffled = shuffleArray(input)
        expect(shuffled).toEqual([1])
    })

    it('should not mutate the original array', () => {
        const input = [1, 2, 3]
        const copy = [...input]
        shuffleArray(input)
        expect(input).toEqual(copy)
    })
})
