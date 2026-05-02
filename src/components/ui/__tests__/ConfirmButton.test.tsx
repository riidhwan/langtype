import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { ConfirmButton } from '../ConfirmButton'

describe('ConfirmButton', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('calls its action after confirmation', () => {
        const handleConfirm = vi.fn()
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        render(
            <ConfirmButton confirmMessage="Delete it?" onConfirm={handleConfirm}>
                Delete
            </ConfirmButton>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete it?')
        expect(handleConfirm).toHaveBeenCalledTimes(1)
    })

    it('skips its action when confirmation is canceled', () => {
        const handleConfirm = vi.fn()
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(
            <ConfirmButton confirmMessage="Delete it?" onConfirm={handleConfirm}>
                Delete
            </ConfirmButton>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        expect(window.confirm).toHaveBeenCalledWith('Delete it?')
        expect(handleConfirm).not.toHaveBeenCalled()
    })
})
