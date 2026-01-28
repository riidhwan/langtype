import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TypingGame } from '../TypingGame'
import { Challenge } from '@/types/challenge'

describe('TypingGame', () => {
    const challenges: Challenge[] = [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
        { id: '3', original: 'Test', translation: 'Prüfung' }
    ]

    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('starts at the first question by default', () => {
        render(<TypingGame challenges={challenges} />)
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('starts at the question specified by initialQuestionId', () => {
        render(<TypingGame challenges={challenges} initialQuestionId="2" />)
        expect(screen.getByText('World')).toBeInTheDocument()
    })

    it('syncs to new question when initialQuestionId prop changes', () => {
        const { rerender } = render(<TypingGame challenges={challenges} initialQuestionId="1" />)
        expect(screen.getByText('Hello')).toBeInTheDocument()

        rerender(<TypingGame challenges={challenges} initialQuestionId="3" />)
        expect(screen.queryByText('Hello')).not.toBeInTheDocument()
        expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('calls onQuestionChange when question advances', () => {
        const onQuestionChange = vi.fn()
        render(<TypingGame challenges={challenges} onQuestionChange={onQuestionChange} />)

        const input = screen.getByRole('textbox')

        // Type correct answer
        fireEvent.change(input, { target: { value: 'Hallo' } })

        // Submit using Enter
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

        // Fast forward to next question
        act(() => {
            vi.advanceTimersByTime(5100)
        })

        expect(screen.getByText('World')).toBeInTheDocument()

        // Should have called with ID '2' (the new question ID)
        expect(onQuestionChange).toHaveBeenCalledWith('2')
    })

    it('does not revert state if internal navigation happens ahead of prop update', () => {
        // This tests the fix for the infinite loop / state reversion bug
        const onQuestionChange = vi.fn()
        const { rerender } = render(
            <TypingGame
                challenges={challenges}
                initialQuestionId="1"
                onQuestionChange={onQuestionChange}
            />
        )

        const input = screen.getByRole('textbox')
        fireEvent.change(input, { target: { value: 'Hallo' } })

        // Submit using Enter
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

        act(() => {
            vi.advanceTimersByTime(5100)
        })

        // Current state: Internal is at "World" (ID 2). Prop is still "1".
        // The component should NOT revert back to "Hello" (ID 1)
        expect(screen.getByText('World')).toBeInTheDocument()

        // Simulate the prop eventually catching up
        rerender(
            <TypingGame
                challenges={challenges}
                initialQuestionId="2"
                onQuestionChange={onQuestionChange}
            />
        )

        expect(screen.getByText('World')).toBeInTheDocument()
    })
})
