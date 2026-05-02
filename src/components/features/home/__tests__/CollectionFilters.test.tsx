import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CollectionFilters } from '../CollectionFilters'

describe('CollectionFilters', () => {
    it('clears search through the clear button', () => {
        const onQueryChange = vi.fn()

        render(
            <CollectionFilters
                query="german"
                onQueryChange={onQueryChange}
                filter="all"
                onFilterChange={vi.fn()}
                totalDue={2}
                tags={[]}
                activeTag={null}
                onTagClick={vi.fn()}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

        expect(onQueryChange).toHaveBeenCalledWith('')
    })

    it('emits query, filter, and tag changes through accessible controls', () => {
        const onQueryChange = vi.fn()
        const onFilterChange = vi.fn()
        const onTagClick = vi.fn()

        render(
            <CollectionFilters
                query=""
                onQueryChange={onQueryChange}
                filter="all"
                onFilterChange={onFilterChange}
                totalDue={3}
                tags={['Grammar', 'Travel']}
                activeTag="Grammar"
                onTagClick={onTagClick}
            />
        )

        fireEvent.change(screen.getByPlaceholderText('Search collections…'), {
            target: { value: 'verbs' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Due (3)' }))
        fireEvent.click(screen.getByRole('button', { name: 'Travel' }))

        expect(onQueryChange).toHaveBeenCalledWith('verbs')
        expect(onFilterChange).toHaveBeenCalledWith('due')
        expect(onTagClick).toHaveBeenCalledWith('Travel')
    })
})
