import { useTypingEngine } from "@/hooks/useTypingEngine"
import { useUrlSync } from "@/hooks/useUrlSync"
import { useEffect, useMemo, useRef } from "react"
import { SentenceDisplay } from "@/components/domain/SentenceDisplay"
import { VisualTranslationInput } from "@/components/domain/VisualTranslationInput"
import { Challenge } from "@/types/challenge"
import { useSRSStore } from "@/store/useSRSStore"

interface SRSContext {
    collectionId: string
    totalDue: number
    isRetry?: boolean
    skipRecording?: boolean
    onCardResult?: (challengeId: string, passed: boolean) => void
}

interface Props {
    challenges: Challenge[]
    initialQuestionId?: string
    onQuestionChange?: (questionId: string) => void
    onFinished?: () => void
    srsContext?: SRSContext
}

export function TypingGame({ challenges, initialQuestionId, onQuestionChange, onFinished, srsContext }: Props) {
    const initialIndex = useMemo(() => {
        if (!initialQuestionId) return 0
        const idx = challenges.findIndex((c) => c.id === initialQuestionId)
        return idx !== -1 ? idx : 0
    }, [challenges, initialQuestionId])

    const translations = useMemo(() => challenges.map((c) => c.translation), [challenges])

    const {
        input,
        setInput,
        isCorrect,
        status,
        submit,
        currentIndex,
        currentSentence,
        timeLeft,
        setCurrentIndex,
        preFilledIndices,
    } = useTypingEngine(
        translations,
        initialIndex,
    )

    const currentChallenge = challenges[currentIndex]

    useUrlSync({
        currentIndex,
        challenges,
        initialQuestionId,
        setCurrentIndex,
        onQuestionChange
    })

    // SRS: record result exactly once per challenge
    const recordReview = useSRSStore((s) => s.recordReview)
    const hasRecordedRef = useRef(false)

    useEffect(() => {
        if (status === 'typing') {
            hasRecordedRef.current = false
            return
        }
        if (!srsContext || hasRecordedRef.current) return
        if (status !== 'completed' && status !== 'submitted') return

        hasRecordedRef.current = true
        const passed = status === 'completed'
        const id = challenges[currentIndex].id

        if (!srsContext.skipRecording) {
            recordReview(srsContext.collectionId, id, passed ? 'correct' : 'incorrect')
        }

        srsContext.onCardResult?.(id, passed)
    }, [status, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    // Detect end of session: last card done, timer expired, nothing left to advance to
    const hasCalledOnFinished = useRef(false)
    useEffect(() => {
        hasCalledOnFinished.current = false
    }, [challenges])

    useEffect(() => {
        if (
            onFinished &&
            !hasCalledOnFinished.current &&
            status !== 'typing' &&
            timeLeft === 0 &&
            challenges.length > 0 &&
            currentIndex === challenges.length - 1
        ) {
            hasCalledOnFinished.current = true
            onFinished()
        }
    }, [status, timeLeft, currentIndex, challenges.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const cardsRemaining = srsContext ? srsContext.totalDue - currentIndex : null

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8">

            {currentChallenge && (
                <SentenceDisplay text={currentChallenge.original} />
            )}

            <div className="w-full flex flex-col items-center gap-4">
                {srsContext && cardsRemaining !== null && (
                    <p className="text-sm text-muted-foreground">
                        {srsContext.isRetry
                            ? `Reviewing ${Math.max(0, cardsRemaining)} missed ${cardsRemaining === 1 ? 'card' : 'cards'}`
                            : `${Math.max(0, cardsRemaining)} ${cardsRemaining === 1 ? 'card' : 'cards'} remaining`}
                    </p>
                )}

                <VisualTranslationInput
                    value={input}
                    onChange={setInput}
                    onSubmit={submit}
                    targetText={currentSentence}
                    preFilledIndices={preFilledIndices}
                    status={status}
                />

                {isCorrect && (
                    <div className="text-green-600 font-bold animate-pulse mt-4">
                        ✨ Correct! Moving to next sentence in {timeLeft}...
                    </div>
                )}

                {status === 'submitted' && (
                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="text-red-600 font-bold">
                            ❌ Incorrect. Moving in {timeLeft}...
                        </div>
                        <div className="text-muted-foreground">
                            Correct answer: <span className="font-mono font-bold text-foreground">{currentSentence}</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}
