import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VisualTranslationInput } from '../VisualTranslationInput'

describe('VisualTranslationInput', () => {
    const defaultProps = {
        value: '',
        onChange: vi.fn(),
        targetText: 'Hi', // Simple target
        status: 'typing' as const,
        isSubmitted: false // Helper potentially? Or derived from status
    }

    it('renders slots with default styling when typing', () => {
        render(<VisualTranslationInput {...defaultProps} value="H" />)
        const slots = screen.getAllByTestId('char-slot')
        expect(slots[0]).toHaveClass('border-foreground') // Neutral/Active style
        expect(slots[0]).not.toHaveClass('bg-[var(--incorrect-bg)]')
        expect(slots[0]).not.toHaveClass('bg-[var(--correct-bg)]')
    })

    it('shows error state when submitted and incorrect', () => {
        render(<VisualTranslationInput {...defaultProps} value="X" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        // First slot 'X' != 'H' -> Error (Red)
        expect(slots[0]).toHaveClass('bg-[var(--incorrect-bg)]')
        expect(slots[0]).toHaveClass('text-[var(--incorrect)]')

        // Second slot empty != 'i' -> Error (Red)
        expect(slots[1]).toHaveClass('bg-[var(--incorrect-bg)]')
    })

    it('shows success state when submitted and correct', () => {
        render(<VisualTranslationInput {...defaultProps} value="H" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        // First slot 'H' == 'H' -> Success (Green)
        expect(slots[0]).toHaveClass('bg-[var(--correct-bg)]')
    })

    it('focuses input when container is clicked', () => {
        render(<VisualTranslationInput {...defaultProps} />)
        // We can click the main container. Since it has no role, we might access by className or modify component to have testid. 
        // Or simpler: click the rendered text slot which bubbles up.
        // Let's add data-testid to container in component? Or just click a slot since we have them.
        const slot = screen.getAllByTestId('char-slot')[0]
        fireEvent.click(slot)

        const input = screen.getByRole('textbox')
        expect(input).toHaveFocus()
    })

    it('submits when Enter is pressed', () => {
        const handleSubmit = vi.fn()
        render(<VisualTranslationInput {...defaultProps} onSubmit={handleSubmit} />)

        const input = screen.getByRole('textbox')
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(handleSubmit).toHaveBeenCalled()
    })

    it('does not submit when Enter is pressed if onSubmit is missing', () => {
        // No onSubmit prop
        render(<VisualTranslationInput {...defaultProps} onSubmit={undefined} />)

        const input = screen.getByRole('textbox')
        // Should not throw
        fireEvent.keyDown(input, { key: 'Enter' })
    })

    it('renders spacers for spaces in target text', () => {
        render(<VisualTranslationInput {...defaultProps} targetText="A B" />)
        // Expect 2 slots (A, B) and 1 spacer?
        // Our implementation: maps chars. If space -> div with aria-hidden.
        // Let's check strict slot count.
        const slots = screen.getAllByTestId('char-slot')
        expect(slots).toHaveLength(2)
    })
    it('disables input when status is not typing', () => {
        const { rerender } = render(<VisualTranslationInput {...defaultProps} status="typing" />)
        expect(screen.getByRole('textbox')).not.toBeDisabled()

        rerender(<VisualTranslationInput {...defaultProps} status="submitted" />)
        expect(screen.getByRole('textbox')).toBeDisabled()

        rerender(<VisualTranslationInput {...defaultProps} status="completed" />)
        expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('sets dynamic keyboard attributes correctly', () => {
        // Target starts with lowercase -> autocapitalize="none"
        const { rerender } = render(<VisualTranslationInput {...defaultProps} targetText="der Mann" />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('autoCapitalize', 'none')
        expect(input).toHaveAttribute('autoCorrect', 'off')
        expect(input).toHaveAttribute('spellCheck', 'false')

        // Target starts with uppercase -> autocapitalize="sentences"
        rerender(<VisualTranslationInput {...defaultProps} targetText="Mann" />)
        expect(input).toHaveAttribute('autoCapitalize', 'sentences')
    })

    it('renders pre-filled characters from indices even if not typed', () => {
        const preFilledIndices = new Set([0, 1, 2]) // "der"
        render(<VisualTranslationInput {...defaultProps} targetText="der Tisch" preFilledIndices={preFilledIndices} value="" />)

        const slots = screen.getAllByTestId('char-slot')
        // "der" slots (0,1,2) should have the characters
        expect(slots[0]).toHaveTextContent('d')
        expect(slots[1]).toHaveTextContent('e')
        expect(slots[2]).toHaveTextContent('r')
        // "T" slot (index 4, after space) should be empty
        expect(slots[3]).toHaveTextContent('')
    })

    it('shows cursor on first char of next word when previous word is fully typed', () => {
        // Regression: value.length after "der" is 3 (a space), which has no rendered slot.
        // The cursor must jump to the first non-freebie slot (index 4, 'N' of "Namen").
        render(<VisualTranslationInput {...defaultProps} targetText="der Namen" value="der" />)

        const slots = screen.getAllByTestId('char-slot')
        // slots: d(0), e(1), r(2), N(4), a(5), m(6), e(7), n(8) — space not rendered
        expect(slots[3]).toHaveClass('outline-[var(--accent)]') // 'N' of "Namen"
        expect(slots[2]).not.toHaveClass('outline-[var(--accent)]') // 'r' of "der" — already typed
    })

    it('marks pre-filled characters as success when submitted even if not typed', () => {
        const preFilledIndices = new Set([0, 1, 2]) // "der"
        render(<VisualTranslationInput {...defaultProps} targetText="der Tisch" preFilledIndices={preFilledIndices} value="" status="submitted" />)

        const slots = screen.getAllByTestId('char-slot')
        // "der" slots (0,1,2) should be green because they are pre-filled
        expect(slots[0]).toHaveClass('bg-[var(--correct-bg)]')
        expect(slots[1]).toHaveClass('bg-[var(--correct-bg)]')
        expect(slots[2]).toHaveClass('bg-[var(--correct-bg)]')

        // "T" slot (index 4) should be red because it's required but empty
        expect(slots[3]).toHaveClass('bg-[var(--incorrect-bg)]')
    })
})
