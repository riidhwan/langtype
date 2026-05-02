import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VisualTranslationInput } from '../VisualTranslationInput'

describe('VisualTranslationInput', () => {
    const defaultProps = {
        value: '',
        onChange: vi.fn(),
        targetText: 'Hi',
        status: 'typing' as const,
    }

    it('renders typed and empty slot states while typing', () => {
        render(<VisualTranslationInput {...defaultProps} value="H" />)
        const slots = screen.getAllByTestId('char-slot')
        expect(slots[0]).toHaveAttribute('data-slot-state', 'typed')
        expect(slots[1]).toHaveAttribute('data-slot-state', 'empty')
    })

    it('shows error state when submitted and incorrect', () => {
        render(<VisualTranslationInput {...defaultProps} value="X" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        expect(slots[0]).toHaveAttribute('data-slot-state', 'incorrect')
        expect(slots[1]).toHaveAttribute('data-slot-state', 'incorrect')
    })

    it('shows success state when submitted and correct', () => {
        render(<VisualTranslationInput {...defaultProps} value="H" status="submitted" />)
        const slots = screen.getAllByTestId('char-slot')

        expect(slots[0]).toHaveAttribute('data-slot-state', 'correct')
    })

    it('focuses input when container is clicked', () => {
        render(<VisualTranslationInput {...defaultProps} />)
        fireEvent.click(screen.getByTestId('visual-translation-input'))

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        expect(input).toHaveFocus()
    })

    it('submits when Enter is pressed', () => {
        const handleSubmit = vi.fn()
        render(<VisualTranslationInput {...defaultProps} onSubmit={handleSubmit} />)

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        fireEvent.keyDown(input, { key: 'Enter' })

        expect(handleSubmit).toHaveBeenCalled()
    })

    it('does not submit when Enter is pressed if onSubmit is missing', () => {
        // No onSubmit prop
        render(<VisualTranslationInput {...defaultProps} onSubmit={undefined} />)

        const input = screen.getByRole('textbox', { name: 'Translation answer' })
        expect(() => fireEvent.keyDown(input, { key: 'Enter' })).not.toThrow()
    })

    it('does not render editable slots for spaces in target text', () => {
        render(<VisualTranslationInput {...defaultProps} targetText="A B" />)
        const slots = screen.getAllByTestId('char-slot')
        expect(slots).toHaveLength(2)
    })
    it('disables input when status is not typing', () => {
        const { rerender } = render(<VisualTranslationInput {...defaultProps} status="typing" />)
        expect(screen.getByRole('textbox', { name: 'Translation answer' })).not.toBeDisabled()

        rerender(<VisualTranslationInput {...defaultProps} status="submitted" />)
        expect(screen.getByRole('textbox', { name: 'Translation answer' })).toBeDisabled()

        rerender(<VisualTranslationInput {...defaultProps} status="completed" />)
        expect(screen.getByRole('textbox', { name: 'Translation answer' })).toBeDisabled()
    })

    it('sets dynamic keyboard attributes correctly', () => {
        // Target starts with lowercase -> autocapitalize="none"
        const { rerender } = render(<VisualTranslationInput {...defaultProps} targetText="der Mann" />)
        const input = screen.getByRole('textbox', { name: 'Translation answer' })
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
        expect(slots[3]).toHaveAttribute('data-current', 'true')
        expect(slots[2]).not.toHaveAttribute('data-current')
    })

    describe('slot sizing by word length', () => {
        it('uses normal slots for short words (≤11 chars)', () => {
            render(<VisualTranslationInput {...defaultProps} targetText="Hallo" />)
            const slots = screen.getAllByTestId('char-slot')
            expect(slots[0]).toHaveAttribute('data-slot-size', 'normal')
        })

        it('uses medium slots for 12-13 char words', () => {
            render(<VisualTranslationInput {...defaultProps} targetText="Verabredungen" />)
            const slots = screen.getAllByTestId('char-slot')
            expect(slots[0]).toHaveAttribute('data-slot-size', 'medium')
        })

        it('uses compact slots for words ≥14 chars', () => {
            render(<VisualTranslationInput {...defaultProps} targetText="Entschuldigung" />)
            const slots = screen.getAllByTestId('char-slot')
            expect(slots[0]).toHaveAttribute('data-slot-size', 'compact')
        })

        it('applies compact slots to all words when any word is ≥14 chars', () => {
            render(<VisualTranslationInput {...defaultProps} targetText="die Krankenschwestern" />)
            const slots = screen.getAllByTestId('char-slot')
            expect(slots[0]).toHaveAttribute('data-slot-size', 'compact')
            expect(slots[3]).toHaveAttribute('data-slot-size', 'compact')
        })
    })

    describe('free input mode', () => {
        const freeProps = { ...defaultProps, freeInput: true }

        it('does not render char slots', () => {
            render(<VisualTranslationInput {...freeProps} targetText="Hallo" />)
            expect(screen.queryAllByTestId('char-slot')).toHaveLength(0)
        })

        it('renders pre-filled indices as static text upfront', () => {
            render(<VisualTranslationInput
                {...freeProps}
                targetText="der Name"
                preFilledIndices={new Set([4, 5, 6, 7])}
            />)
            expect(screen.getByText('Name')).toBeInTheDocument()
        })

        it('shows typed characters in the gap input', () => {
            const onChange = vi.fn()
            render(<VisualTranslationInput
                {...freeProps}
                targetText="der Name"
                preFilledIndices={new Set([4, 5, 6, 7])}
                value=""
                onChange={onChange}
            />)
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'der' } })
            expect(input).toHaveValue('der')
            // onChange receives full assembled answer (gap + pre-filled) for setInputDirect
            expect(onChange).toHaveBeenCalledWith('der Name')
            expect(screen.getByText('Name')).toBeInTheDocument()
        })

        it('Enter on non-last gap moves focus to next gap', () => {
            // "Hallo Welt": gap("Hallo"), prefilled(" "), gap("Welt") — 2 gap inputs
            render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo Welt"
            />)
            const inputs = screen.getAllByRole('textbox')
            expect(inputs).toHaveLength(2)
            fireEvent.keyDown(inputs[0], { key: 'Enter' })
            expect(inputs[1]).toHaveFocus()
        })

        it('Enter on last gap calls onSubmit', () => {
            const handleSubmit = vi.fn()
            render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                onSubmit={handleSubmit}
            />)
            const input = screen.getByRole('textbox')
            fireEvent.keyDown(input, { key: 'Enter' })
            expect(handleSubmit).toHaveBeenCalled()
        })

        it('focuses first gap when challenge changes, even if last gap was active', () => {
            // "Hallo Welt": gap("Hallo"), prefilled(" "), gap("Welt") — 2 gaps
            const { rerender } = render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo Welt"
            />)
            const inputs = screen.getAllByRole('textbox')
            // Advance to second gap
            fireEvent.keyDown(inputs[0], { key: 'Enter' })
            expect(inputs[1]).toHaveFocus()

            // Challenge changes — new targetText also has 2 gaps
            rerender(<VisualTranslationInput
                {...freeProps}
                targetText="Tschüss Welt"
            />)
            const newInputs = screen.getAllByRole('textbox')
            expect(newInputs[0]).toHaveFocus()
        })

        it('marks the active gap while typing', () => {
            render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value=""
                status="typing"
            />)
            expect(screen.getByTestId('translation-gap')).toHaveAttribute('data-gap-state', 'active')
        })

        it('keeps the last gap active after all characters are typed', () => {
            render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value="Hallo"
                status="typing"
            />)
            expect(screen.getByTestId('translation-gap')).toHaveAttribute('data-gap-state', 'active')
        })

        it('clears the active gap state after submission', () => {
            render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value="Hallo"
                status="completed"
            />)
            expect(screen.getByTestId('translation-gap')).not.toHaveAttribute('data-gap-state', 'active')
        })

        it('marks the gap correct on completed answer', () => {
            const { rerender } = render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value=""
                status="typing"
            />)
            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hallo' } })
            rerender(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value="Hallo"
                status="completed"
            />)
            expect(screen.getByTestId('translation-gap')).toHaveAttribute('data-gap-state', 'correct')
        })

        it('marks the gap incorrect on submitted wrong answer', () => {
            const { rerender } = render(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value=""
                status="typing"
            />)
            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Helli' } })
            rerender(<VisualTranslationInput
                {...freeProps}
                targetText="Hallo"
                value="Helli"
                status="submitted"
            />)
            expect(screen.getByTestId('translation-gap')).toHaveAttribute('data-gap-state', 'incorrect')
        })
    })

    it('marks pre-filled characters as success when submitted even if not typed', () => {
        const preFilledIndices = new Set([0, 1, 2]) // "der"
        render(<VisualTranslationInput {...defaultProps} targetText="der Tisch" preFilledIndices={preFilledIndices} value="" status="submitted" />)

        const slots = screen.getAllByTestId('char-slot')
        expect(slots[0]).toHaveAttribute('data-slot-state', 'correct')
        expect(slots[1]).toHaveAttribute('data-slot-state', 'correct')
        expect(slots[2]).toHaveAttribute('data-slot-state', 'correct')

        expect(slots[3]).toHaveAttribute('data-slot-state', 'incorrect')
    })
})
