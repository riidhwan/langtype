import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'



// We need to capture the navigate function mock to assert on it
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-router')>()
    const mockUseLoaderData = vi.fn()
    return {
        ...actual,
        Link: (props: any) => <a href={props.to} {...props}>{props.children}</a>,
        createFileRoute: () => () => ({
            useLoaderData: mockUseLoaderData,
            useSearch: vi.fn(() => ({ questionId: undefined }))
        }),
        _mockUseLoaderData: mockUseLoaderData,
        useNavigate: () => mockNavigate
    }
})

vi.mock('@/components/features/TypingGame', () => ({
    TypingGame: ({ onQuestionChange }: { onQuestionChange?: (id: string) => void }) => (
        <div data-testid="typing-game">
            <button onClick={() => onQuestionChange?.('next-id')} data-testid="next-question-btn">
                Next Question
            </button>
        </div>
    )
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

        vi.mocked(Route.useLoaderData).mockReturnValue(mockCollection)

        render(<CollectionGamePage />)

        const homeLink = screen.getByRole('link', { name: /home/i })
        expect(homeLink).toBeInTheDocument()
    })

    it('navigates when game triggers question change', () => {
        vi.mocked(Route.useLoaderData).mockReturnValue({
            id: 'test',
            title: 'Test',
            challenges: []
        } as any)

        render(<CollectionGamePage />)

        // Find and click the button mocked in TypingGame
        const btn = screen.getByTestId('next-question-btn')
        btn.click()

        // Verify navigation
        expect(mockNavigate).toHaveBeenCalledWith({
            search: { questionId: 'next-id' },
            replace: true
        })
    })
})
