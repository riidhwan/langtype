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
        expect(slots[0]).not.toHaveClass('bg-red-500/20')
        expect(slots[0]).not.toHaveClass('bg-green-500/20')
    })

    it('shows error state when submitted and incorrect', () => {
        render(<VisualTranslationInput {...defaultProps} value="X" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        // First slot 'X' != 'H' -> Error (Red)
        expect(slots[0]).toHaveClass('bg-red-500/20')
        expect(slots[0]).toHaveClass('text-red-600')

        // Second slot empty != 'i' -> Error (Red)
        expect(slots[1]).toHaveClass('bg-red-500/20')
    })

    it('shows success state when submitted and correct', () => {
        render(<VisualTranslationInput {...defaultProps} value="H" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        // First slot 'H' == 'H' -> Success (Green)
        expect(slots[0]).toHaveClass('bg-green-500/20')
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
})
