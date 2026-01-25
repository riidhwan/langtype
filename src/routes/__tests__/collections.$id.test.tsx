import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 1. Mock the dependencies BEFORE importing the component
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()

    // Create a mock for useLoaderData that we can control
    const mockUseLoaderData = vi.fn()

    return {
        ...actual,
        // Mock Link to render a simple anchor
        Link: (props: any) => <a href={props.to} {...props}>{props.children}</a>,
        // Mock createFileRoute to return our mock Route object
        createFileRoute: () => () => ({
            useLoaderData: mockUseLoaderData
        }),
        // Helper to access the mock for assertions/setup
        _mockUseLoaderData: mockUseLoaderData
    }
})

vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: () => <div data-testid="typing-game">Typing Game</div>
}))

// Import after mocking
import { CollectionGamePage, Route } from '../collections.$id'

describe('CollectionGamePage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders back to home link', () => {
        // Setup mock data
        const mockCollection = {
            id: 'test-id',
            title: 'Test Collection',
            description: 'Test Description',
            challenges: []
        }

        // Setup the mock return value
        // Since Route.useLoaderData is our mock function
        vi.mocked(Route.useLoaderData).mockReturnValue(mockCollection)

        // Render the component directly - no RouterProvider needed as we mocked Link and Route
        render(<CollectionGamePage />)

        // Assert
        const homeLink = screen.getByRole('link', { name: /home/i })
        expect(homeLink).toBeInTheDocument()
        expect(homeLink).toHaveAttribute('href', '/')
    })
})
