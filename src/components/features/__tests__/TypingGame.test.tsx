import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TypingGame } from '../TypingGame'
import { Challenge } from '@/types/challenge'

const mockRecordReview = vi.hoisted(() => vi.fn())

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) =>
        selector({ recordReview: mockRecordReview }),
}))

describe('TypingGame', () => {
    const challenges: Challenge[] = [
        { id: '1', original: 'Hello', translation: 'Hallo' },
        { id: '2', original: 'World', translation: 'Welt' },
        { id: '3', original: 'Test', translation: 'Prüfung' }
    ]

    beforeEach(() => {
        vi.useFakeTimers()
        mockRecordReview.mockClear()
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

    describe('SRS recording', () => {
        const singleChallenge: Challenge[] = [
            { id: '1', original: 'Hello', translation: 'Hallo' },
        ]

        it('calls recordReview with "correct" on a correct answer', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })

            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'correct')
            expect(onCardResult).toHaveBeenCalledWith('1', true)
        })

        it('calls recordReview with "incorrect" on a wrong answer', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'wrong answer' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })

            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'incorrect')
            expect(onCardResult).toHaveBeenCalledWith('1', false)
        })

        it('does not call recordReview when skipRecording is true', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, skipRecording: true, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })

            expect(mockRecordReview).not.toHaveBeenCalled()
            // onCardResult still fires even when skipRecording is true
            expect(onCardResult).toHaveBeenCalledWith('1', true)
        })

        it('records a result only once per card even if status persists', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })
            // Advance partially — status stays 'completed' with timeLeft > 0
            act(() => {
                vi.advanceTimersByTime(2000)
            })

            expect(mockRecordReview).toHaveBeenCalledOnce()
        })

        it('shows "X cards remaining" counter when srsContext is provided', () => {
            render(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3 }}
                />
            )

            expect(screen.getByText('3 cards remaining')).toBeInTheDocument()
        })

        it('shows "Reviewing X missed cards" during retry phase', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, isRetry: true }}
                />
            )

            expect(screen.getByText('Reviewing 1 missed card')).toBeInTheDocument()
        })
    })

    describe('onFinished', () => {
        const singleChallenge: Challenge[] = [
            { id: '1', original: 'Hello', translation: 'Hallo' },
        ]

        it('calls onFinished after the last card timer expires', () => {
            const onFinished = vi.fn()
            render(<TypingGame challenges={singleChallenge} onFinished={onFinished} />)

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })

            act(() => {
                vi.advanceTimersByTime(5100)
            })

            expect(onFinished).toHaveBeenCalledOnce()
        })

        it('calls onFinished after an incorrect answer on the last card', () => {
            const onFinished = vi.fn()
            render(<TypingGame challenges={singleChallenge} onFinished={onFinished} />)

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'wrong' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })

            act(() => {
                vi.advanceTimersByTime(5100)
            })

            expect(onFinished).toHaveBeenCalledOnce()
        })

        it('does not call onFinished before the timer expires', () => {
            const onFinished = vi.fn()
            render(<TypingGame challenges={singleChallenge} onFinished={onFinished} />)

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })
            act(() => {
                vi.advanceTimersByTime(2000)
            })

            expect(onFinished).not.toHaveBeenCalled()
        })

        it('does not call onFinished on the last card when more cards remain', () => {
            const onFinished = vi.fn()
            render(<TypingGame challenges={challenges} onFinished={onFinished} />)

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => {
                fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
            })
            act(() => {
                vi.advanceTimersByTime(5100)
            })

            // Advanced to second card — onFinished should not have been called yet
            expect(screen.getByText('World')).toBeInTheDocument()
            expect(onFinished).not.toHaveBeenCalled()
        })
    })
})
