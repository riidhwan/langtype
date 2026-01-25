import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTypingEngine } from '../useTypingEngine'

describe('useTypingEngine', () => {
    const sentences = ['Hello', 'World']

    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('initializes with first sentence', () => {
        const { result } = renderHook(() => useTypingEngine(sentences))
        expect(result.current.currentSentence).toBe('Hello')
        expect(result.current.status).toBe('typing')
    })

    it('handles incorrect submission', () => {
        const { result } = renderHook(() => useTypingEngine(sentences))

        act(() => {
            result.current.setInput('Wrong')
        })

        act(() => {
            result.current.submit()
        })

        expect(result.current.status).toBe('submitted')

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(5100)
        })

        // Should Advance even if wrong
        expect(result.current.currentSentence).toBe('World')
        expect(result.current.input).toBe('')
    })

    it('handles correct submission and auto-advance', () => {
        const { result } = renderHook(() => useTypingEngine(sentences))

        // Type correct answer
        act(() => {
            result.current.setInput('Hello')
        })

        // Submit
        act(() => {
            result.current.submit()
        })

        // Immediate state: completed
        expect(result.current.status).toBe('completed')

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(5100)
        })

        // Should have advanced
        expect(result.current.currentSentence).toBe('World')
        expect(result.current.input).toBe('')
        expect(result.current.status).toBe('typing')
    })

    it('locks input when completed', () => {
        const { result } = renderHook(() => useTypingEngine(sentences))

        act(() => {
            result.current.setInput('Hello')
        })

        act(() => {
            result.current.submit()
        })

        expect(result.current.status).toBe('completed')

        // Try to change input
        act(() => {
            result.current.setInput('Changed')
        })

        // Should stay as 'Hello'
        expect(result.current.input).toBe('Hello')
    })
})
