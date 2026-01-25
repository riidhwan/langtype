import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input Component', () => {
    it('renders with placeholder', () => {
        render(<Input placeholder="Type here..." />)
        expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
    })

    it('calls onChange when user types', () => {
        const handleChange = vi.fn()
        render(<Input onChange={handleChange} />)

        const input = screen.getByRole('textbox')
        fireEvent.change(input, { target: { value: 'Hello' } })

        expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('applies custom className', () => {
        render(<Input className="bg-red-500" />)
        const input = screen.getByRole('textbox')
        expect(input).toHaveClass('bg-red-500')
    })
})
