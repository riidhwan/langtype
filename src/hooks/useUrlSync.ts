import { useEffect, useRef } from 'react'

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
    const currentIndexRef = useRef(currentIndex)
    currentIndexRef.current = currentIndex

    // 1. Sync Logic: Game State (currentIndex) -> URL (onQuestionChange)
    useEffect(() => {
        const currentId = challenges[currentIndex]?.id
        if (initialQuestionId) {
            const initialIndex = challenges.findIndex((c) => c.id === initialQuestionId)
            if (initialIndex !== -1 && initialIndex !== currentIndex) return
        }
        if (currentId && currentId !== initialQuestionId && onQuestionChange) {
            onQuestionChange(currentId)
        }
    }, [currentIndex, challenges, initialQuestionId, onQuestionChange])

    // 2. Sync Logic: URL (top-level prop) -> Game State (setCurrentIndex)
    // This handles deep links, back/forward buttons, etc.
    useEffect(() => {
        if (initialQuestionId && challenges.length > 0) {
            const idx = challenges.findIndex((c) => c.id === initialQuestionId)

            // Only update if:
            // a) The ID exists in the list
            // b) It's different from the current index (prevents redundant updates/loops)
            if (idx !== -1 && idx !== currentIndexRef.current) {
                setCurrentIndex(idx)
            }
        }
    }, [initialQuestionId, challenges, setCurrentIndex])
}
