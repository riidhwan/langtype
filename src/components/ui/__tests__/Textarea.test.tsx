import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Textarea } from '../Textarea'

describe('Textarea', () => {
    it('forwards value and change props', () => {
        const handleChange = vi.fn()
        render(<Textarea value="Initial" onChange={handleChange} />)

        const textarea = screen.getByRole('textbox')
        expect(textarea).toHaveValue('Initial')

        fireEvent.change(textarea, { target: { value: 'Updated' } })

        expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('accepts class overrides', () => {
        render(<Textarea className="bg-background" />)

        expect(screen.getByRole('textbox')).toHaveClass('bg-background')
    })
})
