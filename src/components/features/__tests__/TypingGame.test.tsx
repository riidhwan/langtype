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

        it('calls recordReview with "correct" after clicking Got it', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })

            // Not yet recorded — timer is paused waiting for user choice
            expect(mockRecordReview).not.toHaveBeenCalled()

            fireEvent.click(screen.getByText('Very'))
            act(() => { vi.advanceTimersByTime(2100) })

            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'correct')
            expect(onCardResult).toHaveBeenCalledWith('1', true)
        })

        it('calls recordReview with "incorrect" after countdown expires on wrong answer', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'wrong answer' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            act(() => { vi.advanceTimersByTime(5100) })

            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'incorrect')
            expect(onCardResult).toHaveBeenCalledWith('1', false)
        })

        it('does not call recordReview during the countdown (before timeLeft === 0)', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            act(() => { vi.advanceTimersByTime(2000) })

            expect(mockRecordReview).not.toHaveBeenCalled()
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
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            act(() => { vi.advanceTimersByTime(5100) })

            expect(mockRecordReview).not.toHaveBeenCalled()
            expect(onCardResult).toHaveBeenCalledWith('1', true)
        })

        it('records a result only once even after clicking Got it', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            fireEvent.click(screen.getByText('Very'))
            act(() => { vi.advanceTimersByTime(2100) })

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

    describe('confidence override buttons', () => {
        const singleChallenge: Challenge[] = [
            { id: '1', original: 'Hello', translation: 'Hallo' },
        ]

        function submitCorrect() {
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
        }

        it('shows "How confident were you?" and all three buttons after correct answer in SRS mode', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            expect(screen.getByText('✨ Correct! How confident were you?')).toBeInTheDocument()
            expect(screen.getByText('Not at all')).toBeInTheDocument()
            expect(screen.getByText('Somewhat')).toBeInTheDocument()
            expect(screen.getByText('Very')).toBeInTheDocument()
        })

        it('hides the countdown number while confidence buttons are shown', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            expect(screen.queryByText(/Moving to next sentence in/)).not.toBeInTheDocument()
        })

        it('does NOT auto-advance without a button click (timer is paused)', () => {
            const twoCards: Challenge[] = [
                { id: '1', original: 'Hello', translation: 'Hallo' },
                { id: '2', original: 'World', translation: 'Welt' },
            ]
            render(
                <TypingGame
                    challenges={twoCards}
                    srsContext={{ collectionId: 'col', totalDue: 2 }}
                />
            )
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })

            // Even after a long wait, stays on the same card
            act(() => { vi.advanceTimersByTime(30000) })
            expect(screen.getByText('Hello')).toBeInTheDocument()
        })

        it('advances after clicking Got it', () => {
            const twoCards: Challenge[] = [
                { id: '1', original: 'Hello', translation: 'Hallo' },
                { id: '2', original: 'World', translation: 'Welt' },
            ]
            render(
                <TypingGame
                    challenges={twoCards}
                    srsContext={{ collectionId: 'col', totalDue: 2 }}
                />
            )
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })

            fireEvent.click(screen.getByText('Very'))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(screen.getByText('World')).toBeInTheDocument()
        })

        it('does not show confidence buttons in normal (non-SRS) mode', () => {
            render(<TypingGame challenges={singleChallenge} />)
            submitCorrect()
            expect(screen.queryByText('Not at all')).not.toBeInTheDocument()
            expect(screen.queryByText('Somewhat')).not.toBeInTheDocument()
        })

        it('does not show confidence buttons when skipRecording is true', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, skipRecording: true }}
                />
            )
            submitCorrect()
            expect(screen.queryByText('Not at all')).not.toBeInTheDocument()
            expect(screen.queryByText('Somewhat')).not.toBeInTheDocument()
        })

        it('replaces buttons with feedback text after clicking Again', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Not at all'))
            expect(screen.queryByText('Not at all')).not.toBeInTheDocument()
            expect(screen.getByText('Showing again soon ✓')).toBeInTheDocument()
        })

        it('replaces buttons with countdown and no feedback text after clicking Got it', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Very'))
            expect(screen.queryByText('Very')).not.toBeInTheDocument()
            expect(screen.getByText(/Moving to next sentence in/)).toBeInTheDocument()
            expect(screen.queryByText(/✓/)).not.toBeInTheDocument()
        })

        it('replaces buttons with feedback text after clicking Not sure', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Somewhat'))
            expect(screen.queryByText('Somewhat')).not.toBeInTheDocument()
            expect(screen.getByText('Scheduling sooner ✓')).toBeInTheDocument()
        })

        it('records "incorrect" grade when Again is clicked (after 2s countdown)', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Not at all'))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'incorrect')
        })

        it('records "hard" grade when Not sure is clicked (after 2s countdown)', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Somewhat'))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(mockRecordReview).toHaveBeenCalledWith('col', '1', 'hard')
        })

        it('Again reports passed=false via onCardResult (triggering retry queue)', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Not at all'))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(onCardResult).toHaveBeenCalledWith('1', false)
        })

        it('Not sure reports passed=true via onCardResult', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByText('Somewhat'))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(onCardResult).toHaveBeenCalledWith('1', true)
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
