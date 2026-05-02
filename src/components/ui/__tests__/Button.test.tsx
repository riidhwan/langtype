import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
    it('defaults to type button', () => {
        render(<Button>Save</Button>)

        expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
    })

    it('applies secondary variant classes by default', () => {
        render(<Button>Save</Button>)

        expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-card')
        expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('rounded-[var(--radius)]')
    })

    it('applies link and danger link variant classes', () => {
        render(
            <>
                <Button variant="link">Details</Button>
                <Button variant="dangerLink">Delete</Button>
            </>
        )

        expect(screen.getByRole('button', { name: 'Details' })).toHaveClass('underline')
        expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('text-[var(--incorrect)]')
    })

    it('applies selected pill state', () => {
        render(<Button variant="pill" selected>Due</Button>)

        expect(screen.getByRole('button', { name: 'Due' })).toHaveClass('border-primary')
        expect(screen.getByRole('button', { name: 'Due' })).toHaveClass('bg-[var(--accent-dim)]')
    })

    it('applies disabled state classes', () => {
        render(<Button disabled>Save</Button>)

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('disabled:cursor-not-allowed')
    })

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn()

        render(<Button onClick={handleClick}>Save</Button>)
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(handleClick).toHaveBeenCalledOnce()
    })
})
