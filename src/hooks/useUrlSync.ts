import { useEffect } from 'react'

interface UseUrlSyncProps {
    currentIndex: number
    challenges: { id: string }[]
    initialQuestionId?: string
    setCurrentIndex: (index: number) => void
    onQuestionChange?: (questionId: string) => void
}

export function useUrlSync({
    currentIndex,
    challenges,
    initialQuestionId,
    setCurrentIndex,
    onQuestionChange,
}: UseUrlSyncProps) {
    // Keep track of the last synced ID to prevent loops if necessary,
    // though the logic relies mainly on checking indexes.

    // 1. Sync Logic: Game State (currentIndex) -> URL (onQuestionChange)
    useEffect(() => {
        const currentId = challenges[currentIndex]?.id
        if (currentId && onQuestionChange) {
            onQuestionChange(currentId)
        }
    }, [currentIndex, challenges, onQuestionChange])

    // 2. Sync Logic: URL (top-level prop) -> Game State (setCurrentIndex)
    // This handles deep links, back/forward buttons, etc.
    useEffect(() => {
        if (initialQuestionId && challenges.length > 0) {
            const idx = challenges.findIndex((c) => c.id === initialQuestionId)

            // Only update if:
            // a) The ID exists in the list
            // b) It's different from the current index (prevents redundant updates/loops)
            if (idx !== -1 && idx !== currentIndex) {
                setCurrentIndex(idx)
            }
        }
        // We exclude currentIndex from deps to avoid fighting with the effect above.
        // We only want to react when the *external* URL prop changes.
    }, [initialQuestionId, challenges, setCurrentIndex]) // eslint-disable-line react-hooks/exhaustive-deps
}
