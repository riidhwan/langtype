import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { CollectionList } from '../CollectionList'
import type { Collection } from '@/types/challenge'
import type { HomeCollectionRow } from '@/lib/homeCollections'

interface MockLinkProps {
    children: ReactNode
    className?: string
    title?: string
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    return {
        ...actual,
        Link: ({ children, className, title }: MockLinkProps) => (
            <a className={className} title={title}>{children}</a>
        ),
    }
})

const skeletonCollections: Collection[] = [
    { id: 'alpha', title: 'Alpha' },
    { id: 'beta', title: 'Beta' },
]

const rows: HomeCollectionRow[] = [
    {
        collection: {
            id: 'alpha',
            title: 'Alpha',
            description: 'Everyday phrases',
        },
        dueCount: 2,
        isCustom: false,
    },
    {
        collection: {
            id: 'custom_beta',
            title: 'Beta',
            description: 'Local practice',
        },
        dueCount: 0,
        isCustom: true,
    },
]

describe('CollectionList', () => {
    it('shows placeholder rows while collections are not hydrated', () => {
        const { container } = render(
            <CollectionList
                isHydrated={false}
                skeletonCollections={skeletonCollections}
                collections={rows}
            />
        )

        expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
        expect(screen.queryByText('Everyday phrases')).not.toBeInTheDocument()
        expect(container.firstElementChild?.children).toHaveLength(2)
    })

    it('renders collection rows when hydrated', () => {
        render(
            <CollectionList
                isHydrated
                skeletonCollections={skeletonCollections}
                collections={rows}
            />
        )

        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Everyday phrases')).toBeInTheDocument()
        expect(screen.getByText('2 due')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.getByText('Local practice')).toBeInTheDocument()
        expect(screen.getByText('Custom')).toBeInTheDocument()
        expect(screen.getByText('Edit Beta')).toBeInTheDocument()
    })
})
