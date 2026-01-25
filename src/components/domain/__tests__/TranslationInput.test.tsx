import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TranslationInput } from '../TranslationInput'

describe('TranslationInput', () => {
    const defaultProps = {
        value: '',
        onChange: vi.fn(),
        targetWordCount: 5,
        targetCharCount: 30
    }

    it('renders correctly', () => {
        render(<TranslationInput {...defaultProps} />)
        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
    })

    it('displays correct placeholder with counts', () => {
        render(<TranslationInput {...defaultProps} />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveAttribute('placeholder', 'Type translation (5 words, 30 chars)...')
    })

    it('calls onChange when typing', () => {
        const handleChange = vi.fn()
        render(<TranslationInput {...defaultProps} onChange={handleChange} />)

        const input = screen.getByRole('textbox')
        fireEvent.change(input, { target: { value: 'A' } })

        expect(handleChange).toHaveBeenCalled()
    })
})
