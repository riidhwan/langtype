import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useUrlSync } from '../useUrlSync'

describe('useUrlSync', () => {
    const challenges = [
        { id: '1', translation: 'one' },
        { id: '2', translation: 'two' },
        { id: '3', translation: 'three' },
    ]

    it('calls onQuestionChange when currentIndex updates', () => {
        const onQuestionChange = vi.fn()

        renderHook(({ index }) => useUrlSync({
            currentIndex: index,
            challenges,
            setCurrentIndex: vi.fn(),
            onQuestionChange,
        }), {
            initialProps: { index: 0 }
        })

        // Initial render should trigger sync for index 0 -> id '1'
        expect(onQuestionChange).toHaveBeenCalledWith('1')
    })

    it('updates internal index when initialQuestionId changes (external navigation)', () => {
        const setCurrentIndex = vi.fn()

        const { rerender } = renderHook(({ initialId }) => useUrlSync({
            currentIndex: 0,
            challenges,
            initialQuestionId: initialId,
            setCurrentIndex,
            onQuestionChange: vi.fn(),
        }), {
            initialProps: { initialId: '1' }
        })

        // Initial render: index 0 matches id '1', so no setIndex needed
        expect(setCurrentIndex).not.toHaveBeenCalled()

        // Simulate URL changing to id '2'
        rerender({ initialId: '2' })

        expect(setCurrentIndex).toHaveBeenCalledWith(1) // index of id '2' is 1
    })

    it('does not call setCurrentIndex if initialId matches current index (loop prevention)', () => {
        const setCurrentIndex = vi.fn()

        renderHook(() => useUrlSync({
            currentIndex: 1, // Currently at index 1 ('2')
            challenges,
            initialQuestionId: '2', // URL says '2'
            setCurrentIndex,
            onQuestionChange: vi.fn(),
        }))

        expect(setCurrentIndex).not.toHaveBeenCalled()
    })

    it('does not resync from the URL when only currentIndex changes', () => {
        const setCurrentIndex = vi.fn()

        const { rerender } = renderHook(({ index }) => useUrlSync({
            currentIndex: index,
            challenges,
            initialQuestionId: '1',
            setCurrentIndex,
            onQuestionChange: vi.fn(),
        }), {
            initialProps: { index: 0 }
        })

        expect(setCurrentIndex).not.toHaveBeenCalled()

        rerender({ index: 1 })

        expect(setCurrentIndex).not.toHaveBeenCalled()
    })

    it('handles invalid initialQuestionId gracefully', () => {
        const setCurrentIndex = vi.fn()

        renderHook(() => useUrlSync({
            currentIndex: 0,
            challenges,
            initialQuestionId: 'unknown-id',
            setCurrentIndex,
            onQuestionChange: vi.fn(),
        }))

        expect(setCurrentIndex).not.toHaveBeenCalled()
    })
})
