import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SentenceDisplay } from '../SentenceDisplay'

describe('SentenceDisplay', () => {
    it('renders the sentence correctly', () => {
        const text = 'The quick brown fox.'
        render(<SentenceDisplay text={text} />)

        expect(screen.getByText(text)).toBeInTheDocument()
        expect(screen.getByText('Translate this:')).toBeInTheDocument()
    })
})
