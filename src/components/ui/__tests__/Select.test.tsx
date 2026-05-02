import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Select } from '../Select'

describe('Select', () => {
    it('renders options and fires change events', () => {
        const handleChange = vi.fn()
        render(
            <Select value="free" onChange={handleChange} aria-label="Mode">
                <option value="free">Free input</option>
                <option value="slots">Slot input</option>
            </Select>
        )

        expect(screen.getByRole('option', { name: 'Free input' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Slot input' })).toBeInTheDocument()

        fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: 'slots' } })

        expect(handleChange).toHaveBeenCalledTimes(1)
    })
})
