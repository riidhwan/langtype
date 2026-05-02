import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IconButton } from '../IconButton'
import { IconTrash } from '../icons'

describe('IconButton', () => {
    it('renders an accessible icon-only control', () => {
        const handleClick = vi.fn()
        render(
            <IconButton aria-label="Delete item" onClick={handleClick}>
                <IconTrash />
            </IconButton>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Delete item' }))

        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('honors disabled state', () => {
        const handleClick = vi.fn()
        render(
            <IconButton aria-label="Delete item" disabled onClick={handleClick}>
                <IconTrash />
            </IconButton>
        )

        const button = screen.getByRole('button', { name: 'Delete item' })
        fireEvent.click(button)

        expect(button).toBeDisabled()
        expect(handleClick).not.toHaveBeenCalled()
    })
})
