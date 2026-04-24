import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TypingGame } from '../TypingGame'
import { Challenge } from '@/types/challenge'

const mockRecordReview = vi.hoisted(() => vi.fn())
const mockRecordReviewWithInterval = vi.hoisted(() => vi.fn())

vi.mock('@/store/useSRSStore', () => ({
    useSRSStore: (selector: (s: any) => any) =>
        selector({ recordReview: mockRecordReview, recordReviewWithInterval: mockRecordReviewWithInterval }),
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
        mockRecordReviewWithInterval.mockClear()
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

        it('calls recordReviewWithInterval after clicking a pill', () => {
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

            // Not yet recorded — timer is paused waiting for pill selection
            expect(mockRecordReviewWithInterval).not.toHaveBeenCalled()

            fireEvent.click(screen.getByText('1d'))
            act(() => { vi.advanceTimersByTime(2100) })

            expect(mockRecordReviewWithInterval).toHaveBeenCalledWith('col', '1', 1)
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

        it('does not record while timer is paused waiting for pill selection', () => {
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
            expect(mockRecordReviewWithInterval).not.toHaveBeenCalled()
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

        it('records a result only once after clicking a pill', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            fireEvent.click(screen.getByText('1d'))
            act(() => { vi.advanceTimersByTime(2100) })

            expect(mockRecordReviewWithInterval).toHaveBeenCalledOnce()
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

    describe('interval pills', () => {
        const singleChallenge: Challenge[] = [
            { id: '1', original: 'Hello', translation: 'Hallo' },
        ]

        function submitCorrect() {
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
        }

        it('shows "✨ Correct!" heading and all 7 interval pills after correct answer in SRS mode', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            expect(screen.getByText('✓ correct')).toBeInTheDocument()
            expect(screen.getByText('Review again in:')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'ASAP' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '6h' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '12h' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '1d' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '3d' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '1w' })).toBeInTheDocument()
        })

        it('hides the countdown number while pills are shown', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            expect(screen.queryByText(/moving in/)).not.toBeInTheDocument()
        })

        it('keyboard shortcut 1 selects ASAP pill', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.keyDown(window, { key: '1' })
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.getByText('Review in ASAP ✓')).toBeInTheDocument()
        })

        it('keyboard shortcut 7 selects 1w pill', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.keyDown(window, { key: '7' })
            expect(screen.getByText('Review in 1w ✓')).toBeInTheDocument()
        })

        it('does NOT auto-advance without a pill click (timer is paused)', () => {
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

        it('advances after clicking a pill', () => {
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

            fireEvent.click(screen.getByRole('button', { name: '1d' }))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(screen.getByText('World')).toBeInTheDocument()
        })

        it('does not show interval pills in normal (non-SRS) mode', () => {
            render(<TypingGame challenges={singleChallenge} />)
            submitCorrect()
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'ASAP' })).not.toBeInTheDocument()
        })

        it('does not show interval pills when skipRecording is true', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, skipRecording: true }}
                />
            )
            submitCorrect()
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'ASAP' })).not.toBeInTheDocument()
        })

        it('shows interval pills during retry phase (isRetry: true, no skipRecording)', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, isRetry: true }}
                />
            )
            submitCorrect()
            expect(screen.getByRole('button', { name: 'ASAP' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '1d' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: '1w' })).toBeInTheDocument()
        })

        it('replaces pills with confirmation text after clicking ASAP', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: 'ASAP' }))
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.getByText('Review in ASAP ✓')).toBeInTheDocument()
        })

        it('replaces pills with confirmation text and shows countdown after clicking 1d', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: '1d' }))
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.getByText('Review in 1d ✓')).toBeInTheDocument()
            expect(screen.getByText(/moving in/)).toBeInTheDocument()
        })

        it('replaces pills with confirmation text after clicking 6h', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: '6h' }))
            expect(screen.queryByText('Review again in:')).not.toBeInTheDocument()
            expect(screen.getByText('Review in 6h ✓')).toBeInTheDocument()
        })

        it('calls recordReviewWithInterval(0) when ASAP is clicked', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: 'ASAP' }))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(mockRecordReviewWithInterval).toHaveBeenCalledWith('col', '1', 0)
        })

        it('calls recordReviewWithInterval(0.25) when 6h is clicked', () => {
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1 }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: '6h' }))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(mockRecordReviewWithInterval).toHaveBeenCalledWith('col', '1', 0.25)
        })

        it('ASAP reports passed=false via onCardResult (triggering retry queue)', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: 'ASAP' }))
            act(() => { vi.advanceTimersByTime(2100) })
            expect(onCardResult).toHaveBeenCalledWith('1', false)
        })

        it('6h reports passed=true via onCardResult', () => {
            const onCardResult = vi.fn()
            render(
                <TypingGame
                    challenges={singleChallenge}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )
            submitCorrect()
            fireEvent.click(screen.getByRole('button', { name: '6h' }))
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

        it('calls onFinished exactly once even well past the timer expiry', () => {
            const onFinished = vi.fn()
            render(<TypingGame challenges={singleChallenge} onFinished={onFinished} />)

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            act(() => { vi.advanceTimersByTime(30000) })

            expect(onFinished).toHaveBeenCalledOnce()
        })

        it('calls onCardResult before onFinished for the last correct card in SRS mode', () => {
            const callOrder: string[] = []
            const onCardResult = vi.fn(() => callOrder.push('onCardResult'))
            const onFinished = vi.fn(() => callOrder.push('onFinished'))

            render(
                <TypingGame
                    challenges={singleChallenge}
                    onFinished={onFinished}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Hallo' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            fireEvent.click(screen.getByText('1d'))
            act(() => { vi.advanceTimersByTime(2100) })

            expect(callOrder).toEqual(['onCardResult', 'onFinished'])
        })

        it('calls onCardResult before onFinished for the last incorrect card in SRS mode', () => {
            const callOrder: string[] = []
            const onCardResult = vi.fn(() => callOrder.push('onCardResult'))
            const onFinished = vi.fn(() => callOrder.push('onFinished'))

            render(
                <TypingGame
                    challenges={singleChallenge}
                    onFinished={onFinished}
                    srsContext={{ collectionId: 'col', totalDue: 1, onCardResult }}
                />
            )

            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'wrong' } })
            act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }) })
            act(() => { vi.advanceTimersByTime(5100) })

            expect(callOrder).toEqual(['onCardResult', 'onFinished'])
        })
    })

    describe('counter display', () => {
        it('shows accurate remaining count as cardsCompleted prop increases', () => {
            const { rerender } = render(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3, cardsCompleted: 0 }}
                />
            )
            expect(screen.getByText('3 cards remaining')).toBeInTheDocument()

            rerender(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3, cardsCompleted: 1 }}
                />
            )
            expect(screen.getByText('2 cards remaining')).toBeInTheDocument()

            rerender(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3, cardsCompleted: 2 }}
                />
            )
            expect(screen.getByText('1 card remaining')).toBeInTheDocument()

            rerender(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3, cardsCompleted: 3 }}
                />
            )
            expect(screen.getByText('0 cards remaining')).toBeInTheDocument()
        })

        it('never shows a negative count', () => {
            render(
                <TypingGame
                    challenges={challenges}
                    srsContext={{ collectionId: 'col', totalDue: 3, cardsCompleted: 5 }}
                />
            )
            expect(screen.getByText('0 cards remaining')).toBeInTheDocument()
        })
    })
})
